// js/engines/briefingEngine.js
// FINAL MVP V1 - Daily CFO Briefing Engine

const BriefingEngine = {
  getTodayLimit(budgetAnalysis) {
    return BudgetEngine.calculateTodayLimit(budgetAnalysis.safeToSpend);
  },

  getBiggestLeak(expenseAnalysis) {
    const leaks = SavingOpportunityEngine.findTopLeakCategories(
      expenseAnalysis.monthTransactions || []
    );

    if (leaks.length === 0) {
      return {
        category: "No lifestyle leak",
        amount: 0,
        message: "No lifestyle spending leak detected this month."
      };
    }

    const topLeak = leaks[0];

    return {
      category: topLeak.category,
      amount: topLeak.amount,
      message: `${topLeak.category} is your biggest lifestyle spending area this month.`
    };
  },

  getGoalRisk(data, budgetAnalysis) {
    const activeGoals = (data.goals || []).filter(goal => {
      return !goal.status || goal.status === "active";
    });

    if (activeGoals.length === 0) {
      return {
        level: "none",
        message: "No active goal yet. Add one goal to make Your CFO more useful."
      };
    }

    const totalContribution = activeGoals.reduce((sum, goal) => {
      return sum + Number(goal.monthlyContribution || 0);
    }, 0);

    const safeToSpend = Number(budgetAnalysis.safeToSpend || 0);

    if (totalContribution <= 0) {
      return {
        level: "high",
        message: "Your active goals have no monthly contribution and are not progressing."
      };
    }

    if (safeToSpend <= 0) {
      return {
        level: "high",
        message: "Your goals are creating pressure because safe-to-spend is already negative."
      };
    }

    if (totalContribution > safeToSpend * 0.7) {
      return {
        level: "medium",
        message: "Your goal contribution is aggressive compared to your safe-to-spend."
      };
    }

    return {
      level: "low",
      message: "Your active goals look acceptable compared to your current budget."
    };
  },

  getNextActions({ data, incomeAnalysis, budgetAnalysis, expenseAnalysis, leak, goalRisk }) {
    const actions = [];
    const lifestyle = expenseAnalysis.byIntent?.lifestyle || 0;
    const essential = expenseAnalysis.byIntent?.essential || 0;

    if (!data.profile) {
      return [
        "Complete your CFO profile to unlock a reliable daily spending decision.",
        "Add your real fixed bills before using safe-to-spend."
      ];
    }

    if (incomeAnalysis.isNoIncome && budgetAnalysis.safeToSpend >= 0) {
      actions.push("Keep spending limited to essential needs while no stable income is available.");
    }

    if (budgetAnalysis.safeToSpend < 0) {
      actions.push("Stop all non-essential purchases for the next 7 days.");

      if (lifestyle > 0) {
        actions.push("Reduce lifestyle spending immediately until safe-to-spend becomes positive.");
      } else {
        actions.push("Keep essential spending as low as practical until safe-to-spend becomes positive.");
      }
    } else if (!incomeAnalysis.isNoIncome) {
      actions.push(`Keep today's spending under ${this.getTodayLimit(budgetAnalysis)} MAD.`);
    }

    if (leak.amount > 0) {
      actions.push(`Review ${leak.category} spending and reduce it this week.`);
    }

    if (lifestyle > essential) {
      actions.push("Lifestyle spending is higher than essential spending. Freeze unnecessary purchases.");
    }

    if (goalRisk.level === "high" || goalRisk.level === "medium") {
      actions.push("Review goal contribution and lower it temporarily if needed.");
    }

    if (actions.length === 0) {
      actions.push("Keep tracking expenses daily.");
      actions.push("Check affordability before any purchase above 200 MAD.");
    }

    return actions.slice(0, 4);
  },

  generate(analysis) {
    const dashboard = analysis || CFOEngine.getDashboardAnalysis();

    const {
      data,
      incomeAnalysis,
      expenseAnalysis,
      budgetAnalysis,
      healthAnalysis,
      recommendation
    } = dashboard;

    const safeToSpend = Number(budgetAnalysis.safeToSpend || 0);
    const todayLimit = this.getTodayLimit(budgetAnalysis);
    const leak = this.getBiggestLeak(expenseAnalysis);
    const goalRisk = this.getGoalRisk(data, budgetAnalysis);

    let status = "stable";
    let title = recommendation.title;
    let message = recommendation.message;

    if (!data.profile) {
      status = "setup";
      title = "Create your CFO profile";
      message = "Your CFO needs your profile before giving financial decisions.";
    } else if (incomeAnalysis.isNoIncome) {
      status = safeToSpend < 0 ? "danger" : "control";
      title = "Spending Control Mode";
      message = safeToSpend < 0
        ? `No stable income is available and your safe-to-spend is negative (${safeToSpend} MAD). Budget pressure is active, so focus on essential spending only.`
        : "No stable income detected. Your priority is controlling expenses, not optimizing savings.";
    } else if (safeToSpend < 0) {
      status = "danger";
      title = "Budget pressure detected";
      message = `Your safe-to-spend is negative (${safeToSpend} MAD). Avoid new purchases and reduce spending now.`;
    } else if (healthAnalysis.status === "Risky") {
      status = "danger";
    } else if (safeToSpend < incomeAnalysis.safeMonthlyIncome * 0.1) {
      status = "warning";
      title = "Tight month";
      message = "You still have positive safe-to-spend, but the margin is small. Be careful this week.";
    } else if (healthAnalysis.status === "Strong") {
      status = "strong";
      title = "Strong financial position";
      message = "Your safe-to-spend is positive and your budget is healthy. Keep protecting your goals.";
    } else if (healthAnalysis.status === "Needs Control") {
      status = "warning";
    }

    const actions = this.getNextActions({
      data,
      incomeAnalysis,
      budgetAnalysis,
      expenseAnalysis,
      leak,
      goalRisk
    });

    return {
      status,
      title,
      message,
      todayLimit,
      safeToSpend,
      leak,
      goalRisk,
      actions
    };
  }
};
