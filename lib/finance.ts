export type MoneySummary = {
  incomeCents: number;
  fixedCents: number;
  flexibleSpentCents: number;
  actualSavedCents: number;
  savingsTargetCents: number;
  capitalCents: number;
  emergencyFundCents: number;
};

export type LedgerItem = {
  amountCents: number;
  type: "expense" | "income" | "saving";
  category: string;
  necessity: "necessary" | "flexible" | "discretionary";
  occurredAt: string;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function monthlyAvailableCash(s: MoneySummary) {
  return s.incomeCents - s.fixedCents - s.flexibleSpentCents - Math.max(s.savingsTargetCents, s.actualSavedCents);
}

export function savingsRate(incomeCents: number, savedCents: number) {
  return incomeCents <= 0 ? 0 : Math.round((savedCents / incomeCents) * 10_000);
}

export function projectedMonthEndSpending(spentCents: number, dayOfMonth: number, daysInMonth: number) {
  if (dayOfMonth <= 0 || daysInMonth <= 0) return spentCents;
  return Math.round((spentCents / dayOfMonth) * daysInMonth);
}

export function detectMoneyLeaks(items: LedgerItem[], smallThresholdCents = 4000) {
  const small = items.filter((item) => item.type === "expense" && item.necessity !== "necessary" && item.amountCents <= smallThresholdCents);
  const byCategory = new Map<string, { count: number; totalCents: number }>();
  for (const item of small) {
    const current = byCategory.get(item.category) ?? { count: 0, totalCents: 0 };
    byCategory.set(item.category, { count: current.count + 1, totalCents: current.totalCents + item.amountCents });
  }
  const categories = [...byCategory.entries()].map(([category, value]) => ({ category, ...value })).sort((a, b) => b.totalCents - a.totalCents);
  return {
    count: small.length,
    totalCents: small.reduce((sum, item) => sum + item.amountCents, 0),
    potentiallyAvoidableCents: small.filter((item) => item.necessity === "discretionary").reduce((sum, item) => sum + item.amountCents, 0),
    categories,
  };
}

export function purchaseDecision(summary: MoneySummary, amountCents: number, funding: "monthly" | "savings" | "split" | "other" | "delay", splitFromSavingsCents = 0) {
  const available = monthlyAvailableCash(summary);
  const fromSavings = funding === "savings" ? amountCents : funding === "split" ? clamp(splitFromSavingsCents, 0, amountCents) : 0;
  const fromMonthly = funding === "monthly" ? amountCents : funding === "split" ? amountCents - fromSavings : 0;
  const capitalAfter = summary.capitalCents - fromSavings;
  const monthlyAfter = available - fromMonthly;
  const touchesEmergency = capitalAfter < summary.emergencyFundCents;
  const affordable = funding === "other" || funding === "delay" || (monthlyAfter >= 0 && capitalAfter >= 0 && !touchesEmergency);
  return { affordable, availableBeforeCents: available, monthlyAfterCents: monthlyAfter, capitalAfterCents: capitalAfter, fromMonthlyCents: fromMonthly, fromSavingsCents: fromSavings, touchesEmergency, savingsTargetProtected: fromMonthly <= Math.max(0, available) };
}

export function lifeChangeDecision(summary: MoneySummary, currentMonthlyCents: number, newMonthlyCents: number) {
  const monthlyDeltaCents = newMonthlyCents - currentMonthlyCents;
  const availableBeforeCents = monthlyAvailableCash(summary);
  const availableAfterCents = availableBeforeCents - monthlyDeltaCents;
  return { monthlyDeltaCents, annualDeltaCents: monthlyDeltaCents * 12, availableBeforeCents, availableAfterCents, savingsCapacityAfterCents: Math.max(0, summary.savingsTargetCents + Math.min(0, availableAfterCents)), gapCents: Math.max(0, -availableAfterCents) };
}

export function emergencyDecision(summary: MoneySummary, amountCents: number) {
  const liquidCents = Math.max(0, monthlyAvailableCash(summary));
  const fromMonthlyCents = Math.min(amountCents, liquidCents);
  const remaining = amountCents - fromMonthlyCents;
  const fromEmergencyCents = Math.min(remaining, summary.emergencyFundCents);
  const fromGeneralSavingsCents = Math.min(Math.max(0, remaining - fromEmergencyCents), Math.max(0, summary.capitalCents - summary.emergencyFundCents));
  const uncoveredCents = Math.max(0, remaining - fromEmergencyCents - fromGeneralSavingsCents);
  const capitalAfterCents = summary.capitalCents - fromEmergencyCents - fromGeneralSavingsCents;
  const monthlyRecoveryCents = Math.max(0, summary.actualSavedCents || summary.savingsTargetCents);
  const recoveryMonths = monthlyRecoveryCents > 0 ? Math.ceil((fromEmergencyCents + fromGeneralSavingsCents) / monthlyRecoveryCents) : null;
  return { covered: uncoveredCents === 0, liquidCents, fromMonthlyCents, fromEmergencyCents, fromGeneralSavingsCents, uncoveredCents, capitalAfterCents, recoveryMonths };
}
