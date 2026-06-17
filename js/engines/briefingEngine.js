// js/engines/briefingEngine.js
// FINAL MVP V1 - Daily CFO Briefing Engine

const BriefingEngine = {
  getTodayLimit(budgetAnalysis) {
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(1, daysInMonth - day + 1);

    const safeToSpend = Number(budgetAnalysis.safeToSpend || 0);

    if (safeToSpend <= 0) return 0;

    return Math.floor(safeToSpend / remainingDays);
  },

  getBiggestLeak(expenseAnalysis) {
    const categories = expenseAnalysis.byCategory || {};

    const sorted = Object.entries(categories)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return {
        category: "No leak detected",
        amount: 0,
        message: "No transactions yet. Start tracking daily expenses."
      };
    }

    const [category, amount] = sorted[0];

    return {
      category,
      amount: Math.round(amount),
      message: `${category} is your biggest spending area this month.`
    };
  },

  getGoalRisk(data, budgetAnalysis) {
    const activeGoals = (data.goals || []).filter(goal => goal.status === "active");

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

    if (safeToSpend <= 0 && totalContribution > 0) {
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

  getNextActions({ budgetAnalysis, expenseAnalysis, leak, goalRisk }) {
    const actions = [];

    if (budgetAnalysis.safeToSpend < 0) {
      actions.push("Stop all non-essential purchases for the next 7 days.");
      actions.push("Reduce lifestyle spending immediately until safe-to-spend becomes positive.");
    } else {
      actions.push(`Keep today's spending under ${this.getTodayLimit(budgetAnalysis)} MAD.`);
    }

    if (leak.amount > 0) {
      actions.push(`Review ${leak.category} spending and reduce it this week.`);
    }

    const lifestyle = expenseAnalysis.byIntent?.lifestyle || 0;
    const essential = expenseAnalysis.byIntent?.essential || 0;

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

  generate() {
    const dashboard = CFOEngine.getDashboardAnalysis();

    const {
      data,
      incomeAnalysis,
      expenseAnalysis,
      budgetAnalysis,
      healthAnalysis
    } = dashboard;

    const safeToSpend = Number(budgetAnalysis.safeToSpend || 0);
    const todayLimit = this.getTodayLimit(budgetAnalysis);
    const leak = this.getBiggestLeak(expenseAnalysis);
    const goalRisk = this.getGoalRisk(data, budgetAnalysis);

    let status = "stable";
    let title = "Your month is under control";
    let message = "Your CFO sees a stable month. Keep spending controlled and protect your goals.";

    if (!data.profile) {
      status = "setup";
      title = "Create your CFO profile";
      message = "Your CFO needs your profile before giving financial decisions.";
    } else if (incomeAnalysis.isNoIncome) {
      status = "control";
      title = "Spending Control Mode";
      message = "No stable income detected. Your priority is controlling expenses, not optimizing savings.";
    } else if (safeToSpend < 0) {
      status = "danger";
      title = "Budget pressure detected";
      message = `Your safe-to-spend is negative (${safeToSpend} MAD). Avoid new purchases and reduce spending now.`;
    } else if (safeToSpend < incomeAnalysis.safeMonthlyIncome * 0.1) {
      status = "warning";
      title = "Tight month";
      message = "You still have positive safe-to-spend, but the margin is small. Be careful this week.";
    } else if (healthAnalysis.status === "Strong") {
      status = "strong";
      title = "Strong financial position";
      message = "Your safe-to-spend is positive and your budget is healthy. Keep protecting your goals.";
    }

    const actions = this.getNextActions({
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