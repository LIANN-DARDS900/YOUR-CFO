// js/engines/goalEngine.js
// FINAL MVP V1

const GoalEngine = {
  getActiveGoals(goals = []) {
    return goals.filter(goal => !goal.status || goal.status === "active");
  },

  calculateGoalProgress(goal) {
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);

    if (target <= 0) return 0;

    return Math.min(100, Math.round((current / target) * 100));
  },

  calculateRemainingAmount(goal) {
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);

    return Math.max(0, target - current);
  },

  calculateMonthsNeeded(goal) {
    const remaining = this.calculateRemainingAmount(goal);
    const monthly = Number(goal.monthlyContribution || 0);

    if (remaining <= 0) return 0;
    if (monthly <= 0) return null;

    return Math.ceil(remaining / monthly);
  },

  calculateRequiredMonthlySaving(goal, desiredMonths) {
    const remaining = this.calculateRemainingAmount(goal);
    const months = Number(desiredMonths || 0);

    if (remaining <= 0) return 0;
    if (months <= 0) return null;

    return Math.ceil(remaining / months);
  },

  calculateGoalRealism(goal, safeToSpend) {
    const monthly = Number(goal.monthlyContribution || 0);
    const safe = Number(safeToSpend || 0);

    if (monthly <= 0) {
      return {
        status: "No contribution",
        ratio: null,
        message: "Set a monthly contribution to calculate goal realism."
      };
    }

    if (safe <= 0) {
      return {
        status: "Unrealistic",
        ratio: null,
        message: "Your safe-to-spend is not positive, so this goal is not realistic right now."
      };
    }

    const ratio = monthly / safe;

    if (ratio <= 0.4) {
      return {
        status: "Realistic",
        ratio,
        message: "This goal fits comfortably inside your safe saving capacity."
      };
    }

    if (ratio <= 0.7) {
      return {
        status: "Aggressive",
        ratio,
        message: "This goal is possible, but it will require discipline."
      };
    }

    return {
      status: "Unrealistic",
      ratio,
      message: "This goal is too aggressive compared to your current safe budget."
    };
  },

  summarizeGoals(goals = [], safeToSpend = 0) {
    const activeGoals = this.getActiveGoals(goals);

    const totalTarget = activeGoals.reduce((sum, goal) => {
      return sum + Number(goal.targetAmount || 0);
    }, 0);

    const totalSaved = activeGoals.reduce((sum, goal) => {
      return sum + Number(goal.currentAmount || 0);
    }, 0);

    const totalMonthlyContribution = activeGoals.reduce((sum, goal) => {
      return sum + Number(goal.monthlyContribution || 0);
    }, 0);

    const enrichedGoals = activeGoals.map(goal => {
      return {
        ...goal,
        progress: this.calculateGoalProgress(goal),
        remainingAmount: this.calculateRemainingAmount(goal),
        monthsNeeded: this.calculateMonthsNeeded(goal),
        realism: this.calculateGoalRealism(goal, safeToSpend)
      };
    });

    return {
      activeGoalsCount: activeGoals.length,
      totalTarget: Math.round(totalTarget),
      totalSaved: Math.round(totalSaved),
      totalRemaining: Math.round(totalTarget - totalSaved),
      totalMonthlyContribution: Math.round(totalMonthlyContribution),
      goals: enrichedGoals
    };
  }
};
