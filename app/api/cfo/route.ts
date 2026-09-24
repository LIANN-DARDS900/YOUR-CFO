import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { detectMoneyLeaks, emergencyDecision, lifeChangeDecision, monthlyAvailableCash, projectedMonthEndSpending, purchaseDecision, type LedgerItem, type MoneySummary } from "@/lib/finance";
import { parseNaturalTransaction, parseNaturalTransactions, type ParsedTransaction } from "@/lib/parser";
import { createAIRouter } from "@/lib/ai/providers";
import { assertProfileAccess, canAdminister, canMutate } from "@/lib/authz";
import { getCurrentIdentity } from "@/lib/identity";
import { buildClientDemo } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | boolean | null>;

function db() {
  if (!env.DB) throw new Error("Database is not available");
  return env.DB;
}

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const text = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
const cents = (value: unknown) => { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0 || n > 100_000_000_00) throw new Error("Invalid amount"); return n; };

async function ensureUser(user: { id: string; email: string; name: string }) {
  const database = db();
  const existing = await database.prepare("SELECT id, email, display_name FROM users WHERE id = ?").bind(user.id).first<Row>();
  if (existing) { if (existing.email !== user.email || existing.display_name !== user.name) await database.prepare("UPDATE users SET email=?, display_name=?, updated_at=? WHERE id=?").bind(user.email, user.name, now(), user.id).run(); return; }
  const stamp = now();
  await database.prepare("INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(user.id, user.email, user.name, stamp, stamp).run();
}

async function membership(userId: string, profileId?: string | null) {
  const database = db();
  const row = profileId
    ? await database.prepare("SELECT p.*, m.role FROM financial_profiles p JOIN profile_memberships m ON m.profile_id=p.id WHERE p.id=? AND m.user_id=?").bind(profileId, userId).first<Row>()
    : await database.prepare("SELECT p.*, m.role FROM financial_profiles p JOIN profile_memberships m ON m.profile_id=p.id WHERE m.user_id=? ORDER BY p.created_at LIMIT 1").bind(userId).first<Row>();
  assertProfileAccess(row);
  return row;
}

async function loadState(userId: string, requestedProfileId?: string | null) {
  const database = db();
  const profile = await membership(userId, requestedProfileId);
  const profileId = String(profile.id);
  const [userRow, memberships, txResult, fixedResult, poolsResult, goalsResult] = await Promise.all([
    database.prepare("SELECT email, display_name FROM users WHERE id=?").bind(userId).first<Row>(),
    database.prepare("SELECT p.id, p.name, p.kind, p.currency, m.role FROM financial_profiles p JOIN profile_memberships m ON m.profile_id=p.id WHERE m.user_id=? ORDER BY p.created_at").bind(userId).all<Row>(),
    database.prepare("SELECT * FROM transactions WHERE profile_id=? ORDER BY occurred_at DESC, created_at DESC LIMIT 250").bind(profileId).all<Row>(),
    database.prepare("SELECT * FROM fixed_expenses WHERE profile_id=? AND active=1 ORDER BY amount_cents DESC").bind(profileId).all<Row>(),
    database.prepare("SELECT * FROM savings_pools WHERE profile_id=? ORDER BY created_at").bind(profileId).all<Row>(),
    database.prepare("SELECT * FROM goals WHERE profile_id=? ORDER BY priority, created_at").bind(profileId).all<Row>(),
  ]);
  const transactions = txResult.results;
  const month = new Date().toISOString().slice(0, 7);
  const monthTx = transactions.filter((t) => String(t.occurred_at).startsWith(month));
  const expenseTx = monthTx.filter((t) => t.type === "expense");
  const fixedCents = fixedResult.results.reduce((s, r) => s + Number(r.amount_cents), 0);
  const spentCents = expenseTx.reduce((s, r) => s + Number(r.amount_cents), 0);
  const savedTxCents = monthTx.filter((t) => t.type === "saving").reduce((s, r) => s + Number(r.amount_cents), 0);
  const contribution = await database.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM savings_contributions WHERE profile_id=? AND substr(contributed_at,1,7)=?").bind(profileId, month).first<Row>();
  const actualSavedCents = Math.max(savedTxCents, Number(contribution?.total ?? 0));
  const summary: MoneySummary = { incomeCents: Number(profile.monthly_income_cents), fixedCents, flexibleSpentCents: spentCents, actualSavedCents, savingsTargetCents: Number(profile.monthly_savings_target_cents), capitalCents: Number(profile.capital_cents), emergencyFundCents: Number(profile.emergency_fund_cents) };
  const leaks = detectMoneyLeaks(expenseTx.map((t) => ({ amountCents: Number(t.amount_cents), type: "expense", category: String(t.category), necessity: String(t.necessity), occurredAt: String(t.occurred_at) } as LedgerItem)));
  const day = new Date().getDate(); const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const previousMonthStart = new Date(); previousMonthStart.setMonth(previousMonthStart.getMonth() - 1); const previousMonth = previousMonthStart.toISOString().slice(0, 7);
  const previous = transactions.filter((t) => String(t.occurred_at).startsWith(previousMonth) && t.type === "expense").reduce((s, r) => s + Number(r.amount_cents), 0);
  return { user: { id: userId, email: String(userRow?.email ?? ""), name: String(userRow?.display_name ?? "Your CFO user"), provider: userId.startsWith("supabase:") ? "supabase" : userId === "local-demo-user" ? "local" : "chatgpt" }, profile, profiles: memberships.results, transactions, fixedExpenses: fixedResult.results, savingsPools: poolsResult.results, goals: goalsResult.results, summary: { ...summary, spentCents, availableCents: monthlyAvailableCash(summary), projectedSpentCents: projectedMonthEndSpending(spentCents, day, days), previousMonthSpentCents: previous }, leaks };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentIdentity(); if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    await ensureUser(user);
    const firstMembership = await db().prepare("SELECT profile_id FROM profile_memberships WHERE user_id=? LIMIT 1").bind(user.id).first<Row>();
    if (!firstMembership) return NextResponse.json({ needsOnboarding: true, user: { name: user.name, email: user.email } });
    return NextResponse.json(await loadState(user.id, request.nextUrl.searchParams.get("profileId")));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load finances" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin"); if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    const user = await getCurrentIdentity(); if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    await ensureUser(user);
    const body = await request.json() as Record<string, unknown>;
    const action = text(body.action, 40); const database = db(); const stamp = now();
    if (action === "demo.create") {
      const existing = await database.prepare("SELECT id FROM financial_profiles WHERE owner_user_id=? AND name='Client Demo' LIMIT 1").bind(user.id).first<Row>();
      if (existing) return NextResponse.json({ ok: true, reused: true, state: await loadState(user.id, String(existing.id)) });
      const seed = buildClientDemo(new Date(stamp)); const profileId = id("profile"); const generalPoolId = id("pool");
      const statements: D1PreparedStatement[] = [
        database.prepare("INSERT INTO financial_profiles (id, owner_user_id, name, kind, currency, monthly_income_cents, monthly_savings_target_cents, capital_cents, emergency_fund_cents, onboarded, created_at, updated_at) VALUES (?, ?, ?, 'personal', ?, ?, ?, ?, ?, 1, ?, ?)").bind(profileId, user.id, seed.profile.name, seed.profile.currency, seed.profile.monthlyIncomeCents, seed.profile.savingsTargetCents, seed.profile.capitalCents, seed.profile.emergencyFundCents, stamp, stamp),
        database.prepare("INSERT INTO profile_memberships (id, profile_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', ?, ?)").bind(id("member"), profileId, user.id, stamp, stamp),
        database.prepare("INSERT INTO incomes (id, profile_id, name, amount_cents, frequency, active, created_at, updated_at) VALUES (?, ?, 'Primary salary', ?, 'monthly', 1, ?, ?)").bind(id("income"), profileId, seed.profile.monthlyIncomeCents, stamp, stamp),
      ];
      for (const expense of seed.fixedExpenses) statements.push(database.prepare("INSERT INTO fixed_expenses (id, profile_id, name, category, amount_cents, due_day, recurring, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)").bind(id("fixed"), profileId, expense.name, expense.category, expense.amountCents, expense.dueDay, stamp, stamp));
      for (const pool of seed.pools) statements.push(database.prepare("INSERT INTO savings_pools (id, profile_id, name, kind, balance_cents, target_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(pool.kind === "general" ? generalPoolId : id("pool"), profileId, pool.name, pool.kind, pool.balanceCents, pool.targetCents, stamp, stamp));
      statements.push(database.prepare("INSERT INTO savings_contributions (id, profile_id, pool_id, amount_cents, contributed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id("contribution"), profileId, generalPoolId, seed.profile.savingsTargetCents, stamp, stamp, stamp));
      for (const goal of seed.goals) statements.push(database.prepare("INSERT INTO goals (id, profile_id, name, target_cents, current_cents, deadline, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("goal"), profileId, goal.name, goal.targetCents, goal.currentCents, goal.deadline, goal.priority, stamp, stamp));
      for (const transaction of seed.transactions) statements.push(database.prepare("INSERT INTO transactions (id, profile_id, created_by_user_id, amount_cents, currency, type, category, subcategory, merchant, purpose, occurred_at, necessity, recurring, confidence_bps, original_text, source, created_at, updated_at) VALUES (?, ?, ?, ?, 'MAD', ?, ?, ?, ?, ?, ?, ?, ?, 10000, ?, 'demo', ?, ?)").bind(id("tx"), profileId, user.id, transaction.amountCents, transaction.type, transaction.category, transaction.subcategory, transaction.merchant, transaction.purpose, transaction.occurredAt, transaction.necessity, transaction.recurring ? 1 : 0, transaction.originalText, stamp, stamp));
      statements.push(database.prepare("INSERT INTO ai_insights (id, profile_id, kind, body, evidence_json, provider, expires_at, created_at, updated_at) VALUES (?, ?, 'money_leak', ?, ?, 'deterministic', NULL, ?, ?)").bind(id("insight"), profileId, "27 small discretionary and flexible purchases quietly added up to 812 MAD.", JSON.stringify({ count: 27, totalCents: 81_200 }), stamp, stamp));
      await database.batch(statements);
      return NextResponse.json({ ok: true, created: true, state: await loadState(user.id, profileId) });
    }
    if (action === "onboarding.create") {
      const existingMembership = await database.prepare("SELECT profile_id FROM profile_memberships WHERE user_id=? LIMIT 1").bind(user.id).first<Row>();
      if (existingMembership) return NextResponse.json({ error: "Your financial profile already exists" }, { status: 409 });
      const profileId = id("profile"); const currency = text(body.currency, 3).toUpperCase();
      if (!["MAD", "EUR", "USD"].includes(currency)) throw new Error("Unsupported currency");
      const monthlyIncomeCents = cents(body.monthlyIncomeCents); const fixedExpensesCents = cents(body.fixedExpensesCents); const savingsTargetCents = cents(body.savingsTargetCents); const capitalCents = cents(body.capitalCents); const emergencyFundCents = cents(body.emergencyFundCents ?? 0);
      if (emergencyFundCents > capitalCents) throw new Error("Emergency fund cannot exceed accumulated capital");
      const statements = [
        database.prepare("INSERT INTO financial_profiles (id, owner_user_id, name, kind, currency, monthly_income_cents, monthly_savings_target_cents, capital_cents, emergency_fund_cents, onboarded, created_at, updated_at) VALUES (?, ?, ?, 'personal', ?, ?, ?, ?, ?, 1, ?, ?)").bind(profileId, user.id, text(body.name, 50) || "My Money", currency, monthlyIncomeCents, savingsTargetCents, capitalCents, emergencyFundCents, stamp, stamp),
        database.prepare("INSERT INTO profile_memberships (id, profile_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', ?, ?)").bind(id("member"), profileId, user.id, stamp, stamp),
        database.prepare("INSERT INTO incomes (id, profile_id, name, amount_cents, frequency, active, created_at, updated_at) VALUES (?, ?, 'Primary income', ?, 'monthly', 1, ?, ?)").bind(id("income"), profileId, monthlyIncomeCents, stamp, stamp),
        database.prepare("INSERT INTO savings_pools (id, profile_id, name, kind, balance_cents, target_cents, created_at, updated_at) VALUES (?, ?, 'Emergency fund', 'emergency', ?, NULL, ?, ?)").bind(id("pool"), profileId, emergencyFundCents, stamp, stamp),
        database.prepare("INSERT INTO savings_pools (id, profile_id, name, kind, balance_cents, target_cents, created_at, updated_at) VALUES (?, ?, 'General capital', 'general', ?, NULL, ?, ?)").bind(id("pool"), profileId, Math.max(0, capitalCents - emergencyFundCents), stamp, stamp),
      ];
      if (fixedExpensesCents > 0) statements.push(database.prepare("INSERT INTO fixed_expenses (id, profile_id, name, category, amount_cents, due_day, recurring, active, created_at, updated_at) VALUES (?, ?, 'Monthly fixed expenses', 'Fixed', ?, NULL, 1, 1, ?, ?)").bind(id("fixed"), profileId, fixedExpensesCents, stamp, stamp));
      await database.batch(statements);
      return NextResponse.json({ ok: true, state: await loadState(user.id, profileId) });
    }
    const profile = await membership(user.id, text(body.profileId, 80) || null);
    if (action === "transaction.preview") {
      if (!canMutate(profile.role)) return NextResponse.json({ error: "View-only profile" }, { status: 403 });
      return NextResponse.json({ items: parseNaturalTransactions(text(body.text, 600)) });
    }
    if (action === "transaction.batch_create") {
      if (!canMutate(profile.role)) return NextResponse.json({ error: "View-only profile" }, { status: 403 });
      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) throw new Error("Add between 1 and 20 transactions");
      const items = body.items.map(validateTransactionInput); const transactionIds = items.map(() => id("tx"));
      await database.batch(items.map((item, index) => database.prepare("INSERT INTO transactions (id, profile_id, created_by_user_id, amount_cents, currency, type, category, subcategory, merchant, purpose, occurred_at, necessity, recurring, confidence_bps, original_text, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(transactionIds[index], profile.id, user.id, item.amountCents, item.currency, item.type, item.category, item.subcategory, item.merchant, item.purpose, item.occurredAt, item.necessity, item.recurring ? 1 : 0, item.confidenceBps, item.originalText, item.source, stamp, stamp)));
      return NextResponse.json({ ok: true, transactionIds, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "transaction.create") {
      if (!canMutate(profile.role)) return NextResponse.json({ error: "View-only profile" }, { status: 403 });
      const parsed = parseNaturalTransaction(text(body.text, 300));
      const txId = id("tx");
      await database.prepare("INSERT INTO transactions (id, profile_id, created_by_user_id, amount_cents, currency, type, category, subcategory, merchant, purpose, occurred_at, necessity, recurring, confidence_bps, original_text, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(txId, profile.id, user.id, parsed.amountCents, parsed.currency, parsed.type, parsed.category, parsed.subcategory, parsed.merchant, parsed.purpose, parsed.occurredAt, parsed.necessity, parsed.recurring ? 1 : 0, parsed.confidenceBps, parsed.originalText, parsed.source, stamp, stamp).run();
      return NextResponse.json({ ok: true, transactionId: txId, parsed, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "transaction.update") {
      if (!canMutate(profile.role)) return NextResponse.json({ error: "View-only profile" }, { status: 403 });
      const txId = text(body.transactionId, 90); const amountCents = cents(body.amountCents); const category = text(body.category, 50); const necessity = text(body.necessity, 20);
      if (!category || !["necessary", "flexible", "discretionary"].includes(necessity)) throw new Error("Invalid transaction fields");
      const result = await database.prepare("UPDATE transactions SET amount_cents=?, category=?, necessity=?, recurring=?, merchant=?, purpose=?, updated_at=? WHERE id=? AND profile_id=?").bind(amountCents, category, necessity, body.recurring ? 1 : 0, text(body.merchant, 80) || null, text(body.purpose, 120) || null, stamp, txId, profile.id).run();
      if (!result.meta.changes) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "transaction.delete") {
      if (!canMutate(profile.role)) return NextResponse.json({ error: "View-only profile" }, { status: 403 });
      await database.prepare("DELETE FROM transactions WHERE id=? AND profile_id=?").bind(text(body.transactionId, 90), profile.id).run();
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "profile.update") {
      if (!canAdminister(profile.role)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
      const currency = text(body.currency, 3).toUpperCase();
      if (!["MAD", "EUR", "USD"].includes(currency)) throw new Error("Unsupported currency");
      await database.prepare("UPDATE financial_profiles SET name=?, currency=?, monthly_income_cents=?, monthly_savings_target_cents=?, capital_cents=?, emergency_fund_cents=?, onboarded=1, updated_at=? WHERE id=? AND owner_user_id=?")
        .bind(text(body.name, 50) || profile.name, currency, cents(body.monthlyIncomeCents), cents(body.savingsTargetCents), cents(body.capitalCents), cents(body.emergencyFundCents), stamp, profile.id, user.id).run();
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "fixed_expense.create") {
      if (!canAdminister(profile.role)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
      const name = text(body.name, 60); const category = text(body.category, 40) || "Other"; const amountCents = cents(body.amountCents); const dueDay = optionalDueDay(body.dueDay);
      if (!name || amountCents === 0) throw new Error("Expense name and amount are required");
      await database.prepare("INSERT INTO fixed_expenses (id, profile_id, name, category, amount_cents, due_day, recurring, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)")
        .bind(id("fixed"), profile.id, name, category, amountCents, dueDay, stamp, stamp).run();
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "fixed_expense.update") {
      if (!canAdminister(profile.role)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
      const expenseId = text(body.expenseId, 90); const name = text(body.name, 60); const category = text(body.category, 40) || "Other"; const amountCents = cents(body.amountCents); const dueDay = optionalDueDay(body.dueDay);
      if (!expenseId || !name || amountCents === 0) throw new Error("Expense name and amount are required");
      const result = await database.prepare("UPDATE fixed_expenses SET name=?, category=?, amount_cents=?, due_day=?, updated_at=? WHERE id=? AND profile_id=?").bind(name, category, amountCents, dueDay, stamp, expenseId, profile.id).run();
      if (!result.meta.changes) return NextResponse.json({ error: "Fixed expense not found" }, { status: 404 });
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "fixed_expense.delete") {
      if (!canAdminister(profile.role)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
      const result = await database.prepare("DELETE FROM fixed_expenses WHERE id=? AND profile_id=?").bind(text(body.expenseId, 90), profile.id).run();
      if (!result.meta.changes) return NextResponse.json({ error: "Fixed expense not found" }, { status: 404 });
      return NextResponse.json({ ok: true, state: await loadState(user.id, String(profile.id)) });
    }
    if (action === "profile.create") {
      const profileId = id("profile"); const name = text(body.name, 50) || "New profile"; const kind = body.kind === "shared" ? "shared" : "personal";
      await database.batch([
        database.prepare("INSERT INTO financial_profiles (id, owner_user_id, name, kind, currency, monthly_income_cents, monthly_savings_target_cents, capital_cents, emergency_fund_cents, onboarded, created_at, updated_at) VALUES (?, ?, ?, ?, 'MAD', 0, 0, 0, 0, 0, ?, ?)").bind(profileId, user.id, name, kind, stamp, stamp),
        database.prepare("INSERT INTO profile_memberships (id, profile_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', ?, ?)").bind(id("member"), profileId, user.id, stamp, stamp),
      ]);
      return NextResponse.json({ ok: true, state: await loadState(user.id, profileId) });
    }
    const state = await loadState(user.id, String(profile.id)); const summary = state.summary as MoneySummary & Record<string, number>;
    if (action === "decision.purchase") {
      const input = { amountCents: cents(body.amountCents), funding: ["monthly", "savings", "split", "other", "delay"].includes(String(body.funding)) ? String(body.funding) : "monthly", splitFromSavingsCents: cents(body.splitFromSavingsCents ?? 0) };
      const result = purchaseDecision(summary, input.amountCents, input.funding as "monthly" | "savings" | "split" | "other" | "delay", input.splitFromSavingsCents);
      await saveDecision(database, String(profile.id), user.id, "purchase", "Purchase scenario", input, result, stamp); return NextResponse.json({ result });
    }
    if (action === "decision.life_change") {
      const input = { currentMonthlyCents: cents(body.currentMonthlyCents), newMonthlyCents: cents(body.newMonthlyCents) }; const result = lifeChangeDecision(summary, input.currentMonthlyCents, input.newMonthlyCents);
      await saveDecision(database, String(profile.id), user.id, "life_change", "Life change scenario", input, result, stamp); return NextResponse.json({ result });
    }
    if (action === "decision.emergency") {
      const input = { amountCents: cents(body.amountCents) }; const result = emergencyDecision(summary, input.amountCents);
      await saveDecision(database, String(profile.id), user.id, "emergency", "Emergency scenario", input, result, stamp); return NextResponse.json({ result });
    }
    if (action === "cfo.ask") {
      const question = text(body.question, 400);
      const local = answerLocally(question, state);
      const hasExternalAI = Boolean(env.GEMINI_API_KEY || env.GROQ_API_KEY || env.MISTRAL_API_KEY || env.OPENROUTER_API_KEY);
      if (!hasExternalAI) return NextResponse.json({ answer: local, provider: "local" });
      if (!await consumeAIAllowance(database, user.id, stamp)) return NextResponse.json({ answer: `${local}\n\nYour free AI enhancement limit has been reached for today; verified local analysis remains available.`, provider: "local-limit" });
      try {
        const currency = String(state.profile.currency);
        const major = (amountCents: number) => amountCents / 100;
        const ai = await createAIRouter({ GEMINI_API_KEY: env.GEMINI_API_KEY, GEMINI_MODEL: env.GEMINI_MODEL, GROQ_API_KEY: env.GROQ_API_KEY, GROQ_MODEL: env.GROQ_MODEL, MISTRAL_API_KEY: env.MISTRAL_API_KEY, MISTRAL_MODEL: env.MISTRAL_MODEL, OPENROUTER_API_KEY: env.OPENROUTER_API_KEY, OPENROUTER_MODEL: env.OPENROUTER_MODEL }).analyze(question, { currency, monthlyIncome: major(summary.incomeCents), fixedExpenses: major(summary.fixedCents), spentThisMonth: major(summary.spentCents), savedThisMonth: major(summary.actualSavedCents), availableThisMonth: major(summary.availableCents), accumulatedCapital: major(summary.capitalCents), smallTransactionCount: state.leaks.count, smallTransactionTotal: major(state.leaks.totalCents), potentiallyAvoidable: major(state.leaks.potentiallyAvoidableCents), topLeakCategories: state.leaks.categories.slice(0, 3).map((category) => ({ category: category.category, count: category.count, total: major(category.totalCents) })) });
        return NextResponse.json({ answer: ai?.text || local, provider: ai?.provider || "local" });
      } catch { return NextResponse.json({ answer: local, provider: "local" }); }
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 }); }
}

async function consumeAIAllowance(database: D1Database, userId: string, stamp: string) {
  const day = stamp.slice(0, 10); const configured = Number(env.AI_DAILY_REQUEST_LIMIT ?? 25); const limit = Number.isInteger(configured) ? Math.min(200, Math.max(1, configured)) : 25;
  await database.prepare("INSERT OR IGNORE INTO ai_usage_daily (id, user_id, day, request_count, updated_at) VALUES (?, ?, ?, 0, ?)").bind(id("ai_usage"), userId, day, stamp).run();
  const result = await database.prepare("UPDATE ai_usage_daily SET request_count=request_count+1, updated_at=? WHERE user_id=? AND day=? AND request_count<?").bind(stamp, userId, day, limit).run();
  return Boolean(result.meta.changes);
}

function validateTransactionInput(value: unknown): ParsedTransaction {
  if (!value || typeof value !== "object") throw new Error("Invalid transaction");
  const item = value as Record<string, unknown>; const type = text(item.type, 12); const necessity = text(item.necessity, 20); const currency = text(item.currency, 3).toUpperCase(); const occurredAt = text(item.occurredAt, 40);
  if (!["expense", "income", "saving"].includes(type)) throw new Error("Invalid transaction type");
  if (!["necessary", "flexible", "discretionary"].includes(necessity)) throw new Error("Invalid transaction classification");
  if (!["MAD", "EUR", "USD"].includes(currency)) throw new Error("Unsupported currency");
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) throw new Error("Invalid transaction date");
  const confidenceBps = Math.min(10_000, Math.max(0, Number(item.confidenceBps) || 0));
  return { amountCents: cents(item.amountCents), currency, type: type as ParsedTransaction["type"], category: text(item.category, 50) || "Other", subcategory: text(item.subcategory, 50) || null, merchant: text(item.merchant, 80) || null, purpose: text(item.purpose, 120) || null, occurredAt: new Date(occurredAt).toISOString(), necessity: necessity as ParsedTransaction["necessity"], recurring: Boolean(item.recurring), confidenceBps, originalText: text(item.originalText, 300) || "Manual entry", source: "local" };
}

function optionalDueDay(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const day = Number(value); if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("Due day must be between 1 and 31"); return day;
}

async function saveDecision(database: D1Database, profileId: string, userId: string, mode: string, title: string, input: object, result: object, stamp: string) {
  await database.prepare("INSERT INTO financial_decisions (id, profile_id, created_by_user_id, mode, title, input_json, result_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id("decision"), profileId, userId, mode, title, JSON.stringify(input), JSON.stringify(result), stamp, stamp).run();
}

function answerLocally(question: string, state: Awaited<ReturnType<typeof loadState>>) {
  const q = question.toLowerCase(); const s = state.summary; const top = state.leaks.categories[0]; const f = (value: number) => `${(value / 100).toLocaleString("en-MA")} ${state.profile.currency}`;
  if (/wast|leak|small|unnecessary/.test(q)) return `You made ${state.leaks.count} small flexible or discretionary purchases totaling ${f(state.leaks.totalCents)}. ${top ? `${top.category} is the largest cluster at ${f(top.totalCents)} across ${top.count} transactions.` : "No meaningful small-purchase pattern is visible yet."}`;
  if (/where|going|spend/.test(q)) return `You have spent ${f(s.spentCents)} this month. Fixed commitments are ${f(s.fixedCents)}, and small purchases account for ${f(state.leaks.totalCents)}. Your current available-to-spend amount is ${f(s.availableCents)}.`;
  if (/afford|buy/.test(q)) return `You currently have ${f(s.availableCents)} available this month after fixed costs, spending, and your savings target. Use “Can I buy this?” for the exact capital and reserve impact.`;
  if (/last month|compare/.test(q)) { const delta = s.spentCents - s.previousMonthSpentCents; return `This month you spent ${f(s.spentCents)}. That is ${f(Math.abs(delta))} ${delta >= 0 ? "more" : "less"} than the recorded previous month.`; }
  if (/report|summary/.test(q)) return `Monthly CFO summary: income ${f(s.incomeCents)}, spent ${f(s.spentCents)}, saved ${f(s.actualSavedCents)}, and ${f(s.availableCents)} still available. Small cumulative spending is ${f(state.leaks.totalCents)}.`;
  return `Your verified position: ${f(s.availableCents)} available this month, ${f(s.capitalCents)} accumulated capital, and ${f(s.actualSavedCents)} saved toward a ${f(s.savingsTargetCents)} target. Ask about leaks, affordability, or month comparison for a focused answer.`;
}
