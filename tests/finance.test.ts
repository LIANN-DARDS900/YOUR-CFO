import test from "node:test";
import assert from "node:assert/strict";
import { detectMoneyLeaks, emergencyDecision, lifeChangeDecision, monthlyAvailableCash, projectedMonthEndSpending, purchaseDecision, savingsRate, type MoneySummary } from "../lib/finance.ts";

const summary: MoneySummary = { incomeCents: 1_000_000, fixedCents: 400_000, flexibleSpentCents: 100_000, actualSavedCents: 200_000, savingsTargetCents: 200_000, capitalCents: 2_000_000, emergencyFundCents: 800_000 };

test("monthly cash keeps capital separate", () => assert.equal(monthlyAvailableCash(summary), 300_000));
test("savings rate uses basis points", () => assert.equal(savingsRate(1_000_000, 200_000), 2000));
test("month-end projection is deterministic", () => assert.equal(projectedMonthEndSpending(150_000, 15, 30), 300_000));
test("money leaks accumulate small non-necessary expenses", () => {
  const result = detectMoneyLeaks([
    { amountCents: 1300, type: "expense", category: "Transport", necessity: "flexible", occurredAt: "2026-09-01" },
    { amountCents: 3100, type: "expense", category: "Games", necessity: "discretionary", occurredAt: "2026-09-02" },
    { amountCents: 50_000, type: "expense", category: "Shopping", necessity: "discretionary", occurredAt: "2026-09-03" },
    { amountCents: 1200, type: "expense", category: "Food", necessity: "necessary", occurredAt: "2026-09-04" },
  ]);
  assert.deepEqual({ count: result.count, total: result.totalCents, avoidable: result.potentiallyAvoidableCents }, { count: 2, total: 4400, avoidable: 3100 });
});
test("purchase decision protects emergency reserve", () => { const result = purchaseDecision(summary, 1_300_000, "savings"); assert.equal(result.affordable, false); assert.equal(result.touchesEmergency, true); });
test("split purchase keeps funding sources explicit", () => { const result = purchaseDecision(summary, 230_000, "split", 100_000); assert.equal(result.fromSavingsCents, 100_000); assert.equal(result.fromMonthlyCents, 130_000); assert.equal(result.affordable, true); });
test("life change calculates monthly and annual rent impact", () => { const result = lifeChangeDecision(summary, 300_000, 450_000); assert.equal(result.monthlyDeltaCents, 150_000); assert.equal(result.annualDeltaCents, 1_800_000); assert.equal(result.availableAfterCents, 150_000); });
test("emergency decision uses monthly cash, reserve, then savings", () => { const result = emergencyDecision(summary, 800_000); assert.equal(result.fromMonthlyCents, 300_000); assert.equal(result.fromEmergencyCents, 500_000); assert.equal(result.capitalAfterCents, 1_500_000); assert.equal(result.recoveryMonths, 3); });
