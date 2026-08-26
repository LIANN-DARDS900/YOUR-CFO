// js/engines/decisionGuardEngine.js
// FINAL MVP V1 - CFO Spending Guard

const DecisionGuardEngine = {
  getTodayLimit(safeToSpend) {
    return BudgetEngine.calculateTodayLimit(safeToSpend);
  },

  evaluateExpenseBeforeSave(transactionDraft, data) {
    const incomeAnalysis = IncomeEngine.analyze(data.profile, data.incomeEntries);

    const budgetBefore = BudgetEngine.analyze({
      incomeAnalysis,
      fixedBills: data.fixedBills,
      budgetEnvelopes: data.budgetEnvelopes,
      transactions: data.transactions,
      goals: data.goals,
      profile: data.profile
    });

    const transactionsAfter = [
      ...data.transactions,
      transactionDraft
    ];

    const expenseAfter = ExpenseEngine.analyze(transactionsAfter);

    const budgetAfter = BudgetEngine.analyze({
      incomeAnalysis,
      fixedBills: data.fixedBills,
      budgetEnvelopes: data.budgetEnvelopes,
      transactions: transactionsAfter,
      goals: data.goals,
      profile: data.profile
    });

    const amount = Number(transactionDraft.amount || 0);
    const intent = transactionDraft.intent || "lifestyle";
    const safeBefore = Number(budgetBefore.safeToSpend || 0);
    const safeAfter = Number(budgetAfter.safeToSpend || 0);
    const todayLimit = this.getTodayLimit(safeBefore);

    const flags = [];

    if (!data.profile) {
      return {
        level: "warning",
        title: "No CFO profile yet",
        message: "You can save this expense, but Your CFO cannot judge it correctly until your profile is completed.",
        requiresConfirmation: true,
        systemFlags: ["no_profile"]
      };
    }

    if (incomeAnalysis.isNoIncome && intent === "lifestyle") {
      return {
        level: "danger",
        title: "Lifestyle spending blocked by CFO logic",
        message: "You have no stable income. This is lifestyle spending, so Your CFO recommends avoiding it.",
        requiresConfirmation: true,
        systemFlags: ["no_income_lifestyle"]
      };
    }

    if (safeBefore < 0 && intent === "lifestyle") {
      return {
        level: "danger",
        title: "Budget pressure detected",
        message: `Your safe-to-spend is already negative (${safeBefore} MAD). This lifestyle expense will make the month worse. Your CFO recommends not saving this purchase.`,
        requiresConfirmation: true,
        systemFlags: ["budget_pressure", "lifestyle_risk"]
      };
    }

    if (amount > todayLimit && intent === "lifestyle") {
      flags.push("over_daily_limit");

      if (safeAfter < 0) {
        flags.push("turns_budget_negative");

        return {
          level: "danger",
          title: "This expense breaks today’s limit and your monthly budget",
          message: `Today's recommended max is ${todayLimit} MAD, and this expense would make safe-to-spend ${Math.round(safeAfter)} MAD. Your CFO recommends delaying it or reducing other spending first.`,
          requiresConfirmation: true,
          systemFlags: flags
        };
      }

      return {
        level: "warning",
        title: "Above today’s CFO limit",
        message: `Today's recommended max spending is ${todayLimit} MAD. This expense is ${amount} MAD. Your CFO recommends avoiding or delaying it.`,
        requiresConfirmation: true,
        systemFlags: flags
      };
    }

    if (safeAfter < 0) {
      return {
        level: "danger",
        title: "This expense turns your budget negative",
        message: `After this expense, your safe-to-spend becomes ${Math.round(safeAfter)} MAD. Your CFO recommends reducing other spending before saving it.`,
        requiresConfirmation: true,
        systemFlags: ["turns_budget_negative"]
      };
    }

    if (intent === "essential") {
      return {
        level: "approved",
        title: "Essential expense accepted",
        message: "This expense is essential and fits the current CFO logic.",
        requiresConfirmation: false,
        systemFlags: ["essential_accepted"]
      };
    }

    return {
      level: "approved",
      title: "Expense accepted",
      message: "This expense fits within your current CFO limits.",
      requiresConfirmation: false,
      systemFlags: ["cfo_approved"]
    };
  }
};
