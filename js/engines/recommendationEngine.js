// js/engines/recommendationEngine.js
// FINAL MVP V1 - Consistent CFO Verdicts

const RecommendationEngine = {
  dashboard({ profile, incomeAnalysis, budgetAnalysis, expenseAnalysis, healthAnalysis }) {
    if (!profile) {
      return {
        title: "Welcome to Your CFO",
        message: "Create your financial profile to start."
      };
    }

    if (incomeAnalysis.isNoIncome) {
      return {
        title: "Spending Control Mode",
        message: "You currently have no stable income. Track expenses carefully and avoid lifestyle spending."
      };
    }

    if (budgetAnalysis.safeToSpend < 0) {
      return {
        title: "Budget pressure detected",
        message: `Your safe-to-spend is negative (${budgetAnalysis.safeToSpend} MAD). Your bills, spending, goals, and safety buffer are higher than your safe income. Avoid new purchases and reduce lifestyle expenses.`
      };
    }

    if (healthAnalysis.status === "Strong") {
      return {
        title: "Strong financial position",
        message: "Your safe-to-spend is positive, your fixed bills are controlled, and your spending is healthy. You can focus on goals."
      };
    }

    if (healthAnalysis.status === "Stable") {
      return {
        title: "Stable month",
        message: "You are stable this month. Keep lifestyle spending controlled to protect your savings."
      };
    }

    if (healthAnalysis.status === "Needs Control") {
      return {
        title: "Needs control",
        message: "Your budget is getting tight. Reduce lifestyle expenses this week and protect your safe-to-spend amount."
      };
    }

    return {
      title: "Risky situation",
      message: "Your expenses are too close to your income. Focus on essentials only and avoid new purchases."
    };
  }
};