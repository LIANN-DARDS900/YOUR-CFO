// js/engines/financialHealthEngine.js
// FINAL MVP V1 - Consistent with Safe To Spend

const FinancialHealthEngine = {
  calculateScore({ profile, incomeAnalysis, budgetAnalysis, expenseAnalysis }) {
    if (!profile || incomeAnalysis.isNoIncome) {
      return {
        score: null,
        status: "Spending Control Mode",
        savingsRate: null,
        fixedRatio: null,
        lifestyleRatio: null,
        reason: "No stable income detected."
      };
    }

    const income = Number(incomeAnalysis.safeMonthlyIncome || 0);
    const fixedTotal = Number(budgetAnalysis.fixedTotal || 0);
    const transactions = Number(expenseAnalysis.totalMonthlyTransactions || 0);
    const goalContributions = Number(budgetAnalysis.goalContributions || 0);
    const emergencyBuffer = Number(budgetAnalysis.emergencyBuffer || 0);
    const safeToSpend = Number(budgetAnalysis.safeToSpend || 0);

    const realExpenses = fixedTotal + transactions;
    const reservedMoney = fixedTotal + transactions + goalContributions + emergencyBuffer;

    const savingsRate = income > 0 ? (income - realExpenses) / income : 0;
    const fixedRatio = income > 0 ? fixedTotal / income : 1;

    const lifestyleSpending = expenseAnalysis.byIntent.lifestyle || 0;
    const lifestyleRatio = income > 0 ? lifestyleSpending / income : 1;

    const savingsScore = CFO_clamp((savingsRate / 0.2) * 30, 0, 30);
    const fixedScore = CFO_clamp((1 - fixedRatio) * 25, 0, 25);
    const lifestyleScore = CFO_clamp((1 - lifestyleRatio) * 15, 0, 15);

    const stabilityScore =
      incomeAnalysis.stability === "stable" ? 10 :
      incomeAnalysis.stability === "variable" ? 5 : 0;

    const safeToSpendScore = safeToSpend > 0
      ? CFO_clamp((safeToSpend / income) * 20, 0, 20)
      : 0;

    let score = Math.round(
      savingsScore +
      fixedScore +
      lifestyleScore +
      stabilityScore +
      safeToSpendScore
    );

    // Critical correction:
    // If safe-to-spend is negative, user cannot be "Strong".
    if (safeToSpend < 0) {
      score = Math.min(score, 55);
    }

    if (reservedMoney > income) {
      score = Math.min(score, 50);
    }

    let status = "Risky";

    if (score >= 81 && safeToSpend > 0) {
      status = "Strong";
    } else if (score >= 61 && safeToSpend >= 0) {
      status = "Stable";
    } else if (score >= 41) {
      status = "Needs Control";
    }

    return {
      score,
      status,
      savingsRate,
      fixedRatio,
      lifestyleRatio,
      safeToSpend,
      reservedMoney,
      reason: safeToSpend < 0
        ? "Your safe-to-spend is negative after bills, goals, and emergency buffer."
        : "Your score is based on savings, fixed bills, lifestyle spending, income stability, and safe-to-spend."
    };
  }
};