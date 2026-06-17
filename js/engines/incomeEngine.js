// js/engines/incomeEngine.js
// FINAL MVP V1

const IncomeEngine = {
  normalizeAmountToMonthly(amount, frequency) {
    const value = Number(amount || 0);

    switch (frequency) {
      case "daily":
        return value * 30;

      case "weekly":
        return (value * 52) / 12;

      case "biweekly":
        return value * 2;

      case "yearly":
        return value / 12;

      case "monthly":
      case "fixed":
      case "family_support":
        return value;

      case "none":
        return 0;

      default:
        return value;
    }
  },

  getIncomeStability(profile) {
    if (!profile || profile.incomeType === "none") {
      return "none";
    }

    if (["fixed", "monthly", "family_support"].includes(profile.incomeType)) {
      return "stable";
    }

    if (["daily", "weekly", "biweekly", "irregular"].includes(profile.incomeType)) {
      return "variable";
    }

    return "unknown";
  },

  calculateBaseMonthlyIncome(profile) {
    if (!profile) return 0;

    if (profile.incomeType === "none") return 0;

    return this.normalizeAmountToMonthly(
      profile.baseIncomeAmount,
      profile.incomeType
    );
  },

  calculateLoggedMonthlyIncome(incomeEntries = []) {
    const now = new Date();
    const last90Days = new Date();
    last90Days.setDate(now.getDate() - 90);

    const recentEntries = incomeEntries.filter(entry => {
      return new Date(entry.date) >= last90Days;
    });

    if (recentEntries.length === 0) return 0;

    const total = recentEntries.reduce((sum, entry) => {
      return sum + Number(entry.amount || 0);
    }, 0);

    return total / 3;
  },

  calculateSafeIncomeBaseline(profile, incomeEntries = []) {
    if (!profile) return 0;

    const thresholds = CFO_getThresholds(profile.userType);
    const baseMonthly = this.calculateBaseMonthlyIncome(profile);
    const loggedMonthly = this.calculateLoggedMonthlyIncome(incomeEntries);

    let estimatedIncome = baseMonthly;

    if (
      profile.incomeType === "irregular" ||
      profile.userType === "freelancer" ||
      profile.userType === "business_owner"
    ) {
      estimatedIncome = Math.max(baseMonthly, loggedMonthly);
      estimatedIncome = estimatedIncome * thresholds.incomeConservatism;
    }

    return Math.round(estimatedIncome);
  },

  analyze(profile, incomeEntries = []) {
    const monthlyIncome = this.calculateBaseMonthlyIncome(profile);
    const safeMonthlyIncome = this.calculateSafeIncomeBaseline(profile, incomeEntries);
    const stability = this.getIncomeStability(profile);

    return {
      monthlyIncome: Math.round(monthlyIncome),
      safeMonthlyIncome: Math.round(safeMonthlyIncome),
      stability,
      isNoIncome: !profile || profile.incomeType === "none" || safeMonthlyIncome <= 0
    };
  }
};