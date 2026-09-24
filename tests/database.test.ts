import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const filename of ["0000_chilly_rumiko_fujikawa.sql", "0001_rich_yellow_claw.sql"]) db.exec(readFileSync(new URL(`../drizzle/${filename}`, import.meta.url), "utf8").replaceAll("--> statement-breakpoint", ""));
  const stamp = "2026-09-21T12:00:00.000Z";
  db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run("user_a", "a@example.com", "A", stamp, stamp);
  db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run("user_b", "b@example.com", "B", stamp, stamp);
  db.prepare("INSERT INTO financial_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("profile_a", "user_a", "A Money", "personal", "MAD", 1000000, 200000, 2000000, 800000, 1, stamp, stamp);
  db.prepare("INSERT INTO profile_memberships VALUES (?, ?, ?, ?, ?, ?)").run("member_a", "profile_a", "user_a", "owner", stamp, stamp);
  return db;
}

test("transaction create, edit, and delete round-trip", () => {
  const db = database(); const stamp = "2026-09-21T12:00:00.000Z";
  db.prepare("INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("tx_1", "profile_a", "user_a", 1300, "MAD", "expense", "Transport", "ride", "inDrive", "ride", stamp, "flexible", 0, 9200, "13dh inDrive", "local", stamp, stamp);
  assert.equal((db.prepare("SELECT amount_cents FROM transactions WHERE id='tx_1'").get() as { amount_cents: number }).amount_cents, 1300);
  db.prepare("UPDATE transactions SET category=?, necessity=? WHERE id=? AND profile_id=?").run("Work transport", "necessary", "tx_1", "profile_a");
  const updated = db.prepare("SELECT category, necessity FROM transactions WHERE id='tx_1'").get() as { category: string; necessity: string };
  assert.equal(updated.category, "Work transport"); assert.equal(updated.necessity, "necessary");
  db.prepare("DELETE FROM transactions WHERE id=? AND profile_id=?").run("tx_1", "profile_a");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM transactions WHERE id='tx_1'").get()?.count, 0);
  db.close();
});

test("membership query cannot expose another user's profile", () => {
  const db = database();
  const query = db.prepare("SELECT p.id FROM financial_profiles p JOIN profile_memberships m ON m.profile_id=p.id WHERE p.id=? AND m.user_id=?");
  assert.equal(query.get("profile_a", "user_b"), undefined);
  assert.equal((query.get("profile_a", "user_a") as { id: string }).id, "profile_a");
  db.close();
});

test("profile financial memory and detailed fixed expenses remain profile-scoped", () => {
  const db = database(); const stamp = "2026-09-21T12:00:00.000Z";
  db.prepare("UPDATE financial_profiles SET name=?, currency=?, monthly_income_cents=?, monthly_savings_target_cents=?, capital_cents=?, emergency_fund_cents=? WHERE id=? AND owner_user_id=?")
    .run("Casablanca life", "MAD", 1_250_000, 250_000, 2_400_000, 900_000, "profile_a", "user_a");
  db.prepare("INSERT INTO fixed_expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("fixed_rent", "profile_a", "Rent", "Housing", 450_000, 1, 1, 1, stamp, stamp);
  db.prepare("INSERT INTO fixed_expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("fixed_net", "profile_a", "Internet", "Utilities", 35_000, 10, 1, 1, stamp, stamp);
  db.prepare("UPDATE fixed_expenses SET amount_cents=?, due_day=? WHERE id=? AND profile_id=?").run(40_000, 12, "fixed_net", "profile_a");
  const profile = db.prepare("SELECT name, monthly_income_cents, capital_cents, emergency_fund_cents FROM financial_profiles WHERE id=?").get("profile_a") as Record<string, string | number>;
  assert.deepEqual({ ...profile }, { name: "Casablanca life", monthly_income_cents: 1_250_000, capital_cents: 2_400_000, emergency_fund_cents: 900_000 });
  const expenses = db.prepare("SELECT name, amount_cents, due_day FROM fixed_expenses WHERE profile_id=? ORDER BY amount_cents DESC").all("profile_a");
  assert.deepEqual(expenses.map((expense) => ({ ...expense })), [{ name: "Rent", amount_cents: 450_000, due_day: 1 }, { name: "Internet", amount_cents: 40_000, due_day: 12 }]);
  assert.equal(db.prepare("DELETE FROM fixed_expenses WHERE id=? AND profile_id=?").run("fixed_net", "wrong_profile").changes, 0);
  assert.equal(db.prepare("DELETE FROM fixed_expenses WHERE id=? AND profile_id=?").run("fixed_net", "profile_a").changes, 1);
  db.close();
});

test("daily AI allowance is enforced per user without blocking deterministic features", () => {
  const db = database(); const stamp = "2026-09-23T12:00:00.000Z";
  db.prepare("INSERT OR IGNORE INTO ai_usage_daily (id, user_id, day, request_count, updated_at) VALUES (?, ?, ?, 0, ?)").run("usage_1", "user_a", "2026-09-23", stamp);
  const consume = () => db.prepare("UPDATE ai_usage_daily SET request_count=request_count+1, updated_at=? WHERE user_id=? AND day=? AND request_count<?").run(stamp, "user_a", "2026-09-23", 2).changes;
  assert.equal(consume(), 1); assert.equal(consume(), 1); assert.equal(consume(), 0);
  assert.equal((db.prepare("SELECT request_count FROM ai_usage_daily WHERE user_id=? AND day=?").get("user_a", "2026-09-23") as { request_count: number }).request_count, 2);
  db.close();
});
