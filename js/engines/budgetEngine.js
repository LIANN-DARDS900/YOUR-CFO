// js/engines/budgetEngine.js

const BudgetEngine = {
  normalizeBillToMonthly(bill) {
    const amount = Number(bill.amount || 0);

    switch (bill.frequency) {
      case "weekly":
        return (amount * 52) / 12;

      case "yearly":
        return amount / 12;

      case "monthly":
      default:
        return amount;
    }
  },

  calculateFixedBillsTotal(fixedBills = []) {
    return fixedBills
      .filter(bill => bill.active !== false)
      .reduce((sum, bill) => sum + this.normalizeBillToMonthly(bill), 0);
  },

  calculateEnvelopeTotal(budgetEnvelopes = []) {
    return budgetEnvelopes
      .filter(env => env.active !== false)
      .reduce((sum, env) => sum + Number(env.allocatedAmount || 0), 0);
  },

  calculateEnvelopeUsage(envelopes = [], transactions = []) {
    return envelopes.map(env => {
      const used = transactions
        .filter(tx => tx.envelopeId === env.id)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      return {
        ...env,
        used,
        remaining: Number(env.allocatedAmount || 0) - used,
        usageRate: env.allocatedAmount > 0 ? used / env.allocatedAmount : 0
      };
    });
  },

  calculateUpcomingBills(fixedBills = [], daysAhead = 7) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + daysAhead);

    return fixedBills
      .filter(bill => bill.active !== false)
      .filter(bill => {
        const dueDay = Number(bill.dueDay || 1);
        const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);

        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        return dueDate <= future;
      })
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  },

  calculateSafeToSpend({ safeMonthlyIncome, fixedBills, transactions, goals, profile }) {
    const fixedTotal = this.calculateFixedBillsTotal(fixedBills);
    const monthlyTransactions = ExpenseEngine.analyze(transactions).totalMonthlyTransactions;

    const plannedGoalContributions = goals
      .filter(goal => goal.status === "active")
      .reduce((sum, goal) => sum + Number(goal.monthlyContribution || 0), 0);

    const thresholds = CFO_getThresholds(profile?.userType || "employee");
    const emergencyBuffer = fixedTotal * thresholds.safetyBufferMonths;

    const safeToSpend =
      Number(safeMonthlyIncome || 0)
      - fixedTotal
      - monthlyTransactions
      - plannedGoalContributions
      - emergencyBuffer;

    return {
      fixedTotal: Math.round(fixedTotal),
      monthlyTransactions: Math.round(monthlyTransactions),
      plannedGoalContributions: Math.round(plannedGoalContributions),
      emergencyBuffer: Math.round(emergencyBuffer),
      safeToSpend: Math.round(safeToSpend),
      safeToSpendPositive: safeToSpend > 0
    };
  },

  analyze({ incomeAnalysis, fixedBills, budgetEnvelopes, transactions, goals, profile }) {
    const fixedTotal = this.calculateFixedBillsTotal(fixedBills);
    const envelopeTotal = this.calculateEnvelopeTotal(budgetEnvelopes);
    const envelopeUsage = this.calculateEnvelopeUsage(
      budgetEnvelopes,
      ExpenseEngine.getCurrentMonthTransactions(transactions)
    );

    const safe = this.calculateSafeToSpend({
      safeMonthlyIncome: incomeAnalysis.safeMonthlyIncome,
      fixedBills,
      transactions,
      goals,
      profile
    });

    return {
      fixedTotal: Math.round(fixedTotal),
      envelopeTotal: Math.round(envelopeTotal),
      envelopeUsage,
      ...safe
    };
  }
};