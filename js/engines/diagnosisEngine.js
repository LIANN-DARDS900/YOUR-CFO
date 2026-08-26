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
    const periodFixedCommitments = Number(report.proRataFixedBills || 0);

    const topCategory = this.getTopCategory(report.byCategory);
    const lifestyleRatio = this.getLifestyleRatio(report);

    const dashboard = CFOEngine.getDashboardAnalysis();
    const safeToSpend = Number(dashboard.budgetAnalysis.safeToSpend || 0);
    const monthlyFixedCommitments = Number(
      dashboard.budgetAnalysis.fixedTotal || 0
    );
    const monthlySafeIncome = Number(
      dashboard.incomeAnalysis.safeMonthlyIncome || 0
    );
    const healthStatus = dashboard.healthAnalysis.status || "Not available";
    const noIncome = income <= 0 || dashboard.incomeAnalysis.isNoIncome;

    let verdict = "Stable month";
    let severity = "stable";

    if (safeToSpend < 0) {
      verdict = "Budget pressure detected";
      severity = "danger";
    } else if (noIncome) {
      verdict = "Spending control mode";
      severity = "warning";
    } else if (realSavings < 0) {
      verdict = "Negative savings period";
      severity = "danger";
    } else if (healthStatus === "Risky") {
      verdict = "Risky financial position";
      severity = "danger";
    } else if (safeToSpend < monthlySafeIncome * 0.1) {
      verdict = "Tight month";
      severity = "warning";
    } else if (healthStatus === "Needs Control") {
      verdict = "Needs control";
      severity = "warning";
    } else if (
      safeToSpend > 0 &&
      healthStatus === "Strong" &&
      realSavings >= income * 0.2
    ) {
      verdict = "Strong month";
      severity = "strong";
    }

    const facts = [];

    facts.push(`Estimated income for this period: ${income} MAD.`);
    facts.push(`Total expenses for this period: ${totalExpenses} MAD.`);
    facts.push(`Real savings after expenses: ${realSavings} MAD.`);
    facts.push(`Current safe-to-spend after CFO rules: ${safeToSpend} MAD.`);
    facts.push(`Financial health status: ${healthStatus}.`);
    facts.push(`Fixed commitments for this period represent ${periodFixedCommitments} MAD.`);
    facts.push(`Current monthly fixed commitments represent ${monthlyFixedCommitments} MAD.`);
    facts.push(`Daily transactions represent ${transactionSpending} MAD.`);
    facts.push(`Lifestyle spending is ${Math.round(lifestyleRatio * 100)}% of daily transactions.`);

    if (topCategory.amount > 0) {
      facts.push(`Your biggest spending category is ${topCategory.category} with ${topCategory.amount} MAD.`);
    }

    const risks = [];

    if (noIncome) {
      risks.push("No stable income is available, so spending control takes priority over savings optimization.");
    }

    if (safeToSpend < 0 && realSavings >= 0) {
      risks.push("Your basic savings may look positive, but your CFO safe-to-spend is negative after goals, buffers, and commitments.");
    } else if (safeToSpend < 0) {
      risks.push("Your CFO safe-to-spend is negative after goals, buffers, and commitments.");
    }

    if (realSavings < 0) {
      risks.push("You are spending more than the estimated income for this period.");
    }

    if (lifestyleRatio > 0.5) {
      risks.push("Lifestyle spending represents more than half of your daily transactions.");
    }

    if (periodFixedCommitments > income * 0.5 && income > 0) {
      risks.push("Fixed commitments are too heavy compared to income.");
    }

    if (topCategory.amount > transactionSpending * 0.4 && transactionSpending > 0) {
      risks.push(`${topCategory.category} is dominating your variable spending.`);
    }

    if (risks.length === 0) {
      risks.push("No major risk detected, but expenses should still be monitored.");
    }

    const actions = [];

    if (safeToSpend < 0) {
      actions.push("Stop non-essential purchases until safe-to-spend becomes positive.");

      if (lifestyleRatio > 0) {
        actions.push("Reduce lifestyle spending immediately, starting with the biggest leak.");
      } else {
        actions.push("Keep essential spending as low as practical while the budget is under pressure.");
      }

      actions.push("Review fixed commitments and goal contributions creating monthly pressure.");

      if (noIncome) {
        actions.push("Use spending control mode and protect cash for essential needs only.");
      }
    } else if (noIncome) {
      actions.push("Keep spending limited to essential needs.");
      actions.push("Avoid new lifestyle commitments until stable income is available.");
      actions.push("Track every expense so your remaining cash stays visible.");
    } else if (realSavings < 0) {
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
      lifestyleRatio: Math.round(lifestyleRatio * 100),
      safeToSpend,
      healthStatus,
      noIncome
    };
  }
};
