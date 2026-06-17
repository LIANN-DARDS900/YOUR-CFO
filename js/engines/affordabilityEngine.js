// js/engines/affordabilityEngine.js

const AffordabilityEngine = {
  checkPurchase(purchase, data) {
    const incomeAnalysis = IncomeEngine.analyze(data.profile, data.incomeEntries);
    const budgetAnalysis = BudgetEngine.analyze({
      incomeAnalysis,
      fixedBills: data.fixedBills,
      budgetEnvelopes: data.budgetEnvelopes,
      transactions: data.transactions,
      goals: data.goals,
      profile: data.profile
    });

    const upcomingBills = BudgetEngine.calculateUpcomingBills(data.fixedBills, 7);
    const thresholds = CFO_getThresholds(data.profile?.userType || "employee");

    const fixedTotal = budgetAnalysis.fixedTotal;
    const emergencyBuffer = fixedTotal * thresholds.safetyBufferMonths;
    const safeToSpend = budgetAnalysis.safeToSpend - upcomingBills;

    const amount = Number(purchase.amount || 0);

    if (amount <= 0) {
      return {
        verdict: "INVALID",
        title: "Invalid purchase amount",
        message: "Enter a valid amount."
      };
    }

    if (amount <= safeToSpend) {
      return {
        verdict: "YES",
        title: "You can afford this safely",
        message: `This purchase fits inside your safe-to-spend amount of ${Math.round(safeToSpend)} MAD.`
      };
    }

    if (amount <= safeToSpend * 1.2 && purchase.intent === "essential") {
      return {
        verdict: "YES_BUT_CAREFUL",
        title: "You can buy it, but be careful",
        message: "This is essential, but it will tighten your budget. Avoid lifestyle spending after this."
      };
    }

    const monthlySavingCapacity = Math.max(500, Math.round(Math.max(budgetAnalysis.safeToSpend, 0)));
    const monthsNeeded = monthlySavingCapacity > 0
      ? Math.ceil(amount / monthlySavingCapacity)
      : null;

    return {
      verdict: "SET_GOAL",
      title: "Set a goal instead",
      message: monthsNeeded
        ? `This is not safe right now. Save around ${monthlySavingCapacity} MAD/month and you can buy it in about ${monthsNeeded} months.`
        : "This is not safe right now. Create a goal when your budget becomes positive.",
      suggestedGoal: {
        title: purchase.name,
        targetAmount: amount,
        monthlyContribution: monthlySavingCapacity
      }
    };
  }
};