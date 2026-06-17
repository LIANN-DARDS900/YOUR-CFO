// js/engines/diagnosisEngine.js
// FINAL MVP V1 - CFO Monthly Diagnosis

const DiagnosisEngine = {
  getTopCategory(byCategory = {}) {
    const sorted = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return {
        category: "No category",
        amount: 0
      };
    }

    return {
      category: sorted[0][0],
      amount: Math.round(sorted[0][1])
    };
  },

  getLifestyleRatio(report) {
    const lifestyle = Number(report.byIntent?.lifestyle || 0);
    const total = Number(report.transactionSpending || 0);

    if (total <= 0) return 0;

    return lifestyle / total;
  },

  generate(data, report) {
    const income = Number(report.estimatedIncome || 0);
    const totalExpenses = Number(report.totalExpenses || 0);
    const realSavings = Number(report.realSavings || 0);
    const transactionSpending = Number(report.transactionSpending || 0);
    const fixedBills = Number(report.proRataFixedBills || 0);

    const topCategory = this.getTopCategory(report.byCategory);
    const lifestyleRatio = this.getLifestyleRatio(report);

const dashboard = CFOEngine.getDashboardAnalysis();
const safeToSpend = Number(dashboard.budgetAnalysis.safeToSpend || 0);
const healthStatus = dashboard.healthAnalysis.status;

let verdict = "Stable month";
let severity = "stable";

if (income <= 0 || dashboard.incomeAnalysis.isNoIncome) {
  verdict = "Spending control mode";
  severity = "warning";
} else if (safeToSpend < 0) {
  verdict = "Budget pressure detected";
  severity = "danger";
} else if (realSavings < 0) {
  verdict = "Negative savings period";
  severity = "danger";
} else if (safeToSpend < income * 0.1) {
  verdict = "Tight month";
  severity = "warning";
} else if (healthStatus === "Strong" && realSavings >= income * 0.2) {
  verdict = "Strong month";
  severity = "strong";
}
    const facts = [];

    facts.push(`Estimated income for this period: ${income} MAD.`);
    facts.push(`Total expenses for this period: ${totalExpenses} MAD.`);
    facts.push(`Real savings after expenses: ${realSavings} MAD.`);
    facts.push(`Current safe-to-spend after CFO rules: ${safeToSpend} MAD.`);
    facts.push(`Financial health status: ${healthStatus}.`);
    facts.push(`Fixed commitments represent ${fixedBills} MAD.`);
    facts.push(`Daily transactions represent ${transactionSpending} MAD.`);

    if (topCategory.amount > 0) {
      facts.push(`Your biggest spending category is ${topCategory.category} with ${topCategory.amount} MAD.`);
    }

    const risks = [];
if (safeToSpend < 0) {
  risks.push("Your dashboard safe-to-spend is negative, so the month is under pressure even if basic savings look positive.");
}
    if (realSavings < 0) {
      risks.push("You are spending more than the estimated income for this period.");
    }

    if (lifestyleRatio > 0.5) {
      risks.push("Lifestyle spending represents more than half of your daily transactions.");
    }

    if (fixedBills > income * 0.5 && income > 0) {
      risks.push("Fixed commitments are too heavy compared to income.");
    }


    if (topCategory.amount > transactionSpending * 0.4 && transactionSpending > 0) {
      risks.push(`${topCategory.category} is dominating your variable spending.`);
    }

    if (risks.length === 0) {
      risks.push("No major risk detected, but expenses should still be monitored.");
    }

    const actions = [];

    if (realSavings < 0) {
      actions.push("Freeze all non-essential purchases for 7 days.");
      actions.push("Cut the biggest spending category immediately.");
      actions.push("Do not create new goals until real savings becomes positive.");
    } else if (realSavings < income * 0.1) {
      actions.push("Keep purchases small for the rest of the period.");
      actions.push("Reduce lifestyle expenses by at least 20%.");
      actions.push("Check affordability before any purchase above 200 MAD.");
    } else {
      actions.push("Keep tracking daily expenses.");
      actions.push("Protect your savings and continue goal contributions.");
      actions.push("Review lifestyle categories once per week.");
    }

    if (topCategory.amount > 0) {
      actions.push(`Set a limit for ${topCategory.category} next period.`);
    }

    return {
      verdict,
      severity,
      facts,
      risks,
      actions: actions.slice(0, 5),
      topCategory,
      lifestyleRatio: Math.round(lifestyleRatio * 100)
    };
  }
};