import test from "node:test";
import assert from "node:assert/strict";
import { buildClientDemo } from "../lib/demo-data.ts";
import { detectMoneyLeaks, monthlyAvailableCash } from "../lib/finance.ts";

test("client demo tells the intended money-leak story", () => {
  const demo = buildClientDemo(new Date("2026-09-23T12:00:00.000Z"));
  const currentExpenses = demo.transactions.filter((item) => item.type === "expense" && item.occurredAt.startsWith("2026-09"));
  const leaks = detectMoneyLeaks(currentExpenses);
  const fixedCents = demo.fixedExpenses.reduce((total, item) => total + item.amountCents, 0);
  const spentCents = currentExpenses.reduce((total, item) => total + item.amountCents, 0);

  assert.equal(leaks.count, 27);
  assert.equal(leaks.totalCents, 81_200);
  assert.equal(fixedCents, 400_000);
  assert.equal(spentCents, 218_100);
  assert.equal(monthlyAvailableCash({
    incomeCents: demo.profile.monthlyIncomeCents,
    fixedCents,
    flexibleSpentCents: spentCents,
    actualSavedCents: demo.profile.savingsTargetCents,
    savingsTargetCents: demo.profile.savingsTargetCents,
    capitalCents: demo.profile.capitalCents,
    emergencyFundCents: demo.profile.emergencyFundCents,
  }), 181_900);
});

test("client demo includes previous-period comparison, savings, and goals", () => {
  const demo = buildClientDemo(new Date("2026-01-05T12:00:00.000Z"));
  const previousMonthExpenses = demo.transactions.filter((item) => item.type === "expense" && item.occurredAt.startsWith("2025-12"));

  assert.equal(previousMonthExpenses.reduce((total, item) => total + item.amountCents, 0), 175_000);
  assert.equal(demo.transactions.some((item) => item.type === "saving" && item.amountCents === 200_000), true);
  assert.deepEqual(demo.pools.map((pool) => pool.balanceCents), [800_000, 1_200_000]);
  assert.equal(demo.goals.length, 2);
});
