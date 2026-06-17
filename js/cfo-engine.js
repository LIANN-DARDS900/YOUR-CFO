// js/cfo-engine.js

const CFOEngine = {
  getDashboardAnalysis() {
    const data = CFOStorage.load();

    const incomeAnalysis = IncomeEngine.analyze(
      data.profile,
      data.incomeEntries
    );

    const expenseAnalysis = ExpenseEngine.analyze(
      data.transactions
    );

    const budgetAnalysis = BudgetEngine.analyze({
      incomeAnalysis,
      fixedBills: data.fixedBills,
      budgetEnvelopes: data.budgetEnvelopes,
      transactions: data.transactions,
      goals: data.goals,
      profile: data.profile
    });

    const healthAnalysis = FinancialHealthEngine.calculateScore({
      profile: data.profile,
      incomeAnalysis,
      budgetAnalysis,
      expenseAnalysis
    });

    const recommendation = RecommendationEngine.dashboard({
      profile: data.profile,
      incomeAnalysis,
      budgetAnalysis,
      expenseAnalysis,
      healthAnalysis
    });

    return {
      data,
      incomeAnalysis,
      expenseAnalysis,
      budgetAnalysis,
      healthAnalysis,
      recommendation
    };
  },

  addTransactionAndAnalyze(transaction) {
    const dataBefore = CFOStorage.load();

    const saved = CFOStorage.addTransaction(transaction);

    const dataAfter = CFOStorage.load();

    const alert = ExpenseEngine.detectLifestyleCreep(
      saved,
      dataAfter.transactions
    );

    if (alert) {
      saved.systemFlags.push("lifestyle_creep");

      const data = CFOStorage.load();
      data.transactions = data.transactions.map(tx => {
        return tx.id === saved.id ? saved : tx;
      });

      CFOStorage.save(data);
    }

    return {
      transaction: saved,
      lifestyleAlert: alert,
      recommendation: RecommendationEngine.lifestyleCreep(alert)
    };
  },

  canIAfford(purchase) {
    const data = CFOStorage.load();
    return AffordabilityEngine.checkPurchase(purchase, data);
  }
};