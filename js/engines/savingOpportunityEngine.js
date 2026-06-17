// js/engines/savingOpportunityEngine.js
// FINAL MVP V1

const SavingOpportunityEngine = {
  calculatePossibleSavings(transactions = []) {
    const lifestyleTransactions = transactions.filter(tx => {
      return tx.intent === "lifestyle";
    });

    const lifestyleTotal = lifestyleTransactions.reduce((sum, tx) => {
      return sum + Number(tx.amount || 0);
    }, 0);

    const possibleSaving = lifestyleTotal * 0.3;

    return {
      lifestyleTotal: Math.round(lifestyleTotal),
      possibleSaving: Math.round(possibleSaving)
    };
  },

  findTopLeakCategories(transactions = []) {
    const lifestyleTransactions = transactions.filter(tx => {
      return tx.intent === "lifestyle";
    });

    const grouped = lifestyleTransactions.reduce((groups, tx) => {
      const category = tx.category || "Other";
      groups[category] = (groups[category] || 0) + Number(tx.amount || 0);
      return groups;
    }, {});

    return Object.entries(grouped)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  },

  generateReductionPlan(transactions = []) {
    const leaks = this.findTopLeakCategories(transactions);

    return leaks.map(item => {
      return {
        category: item.category,
        currentSpending: item.amount,
        suggestedCut: Math.round(item.amount * 0.3),
        newTarget: Math.round(item.amount * 0.7)
      };
    });
  },

  analyzeSpendingSpeed(data) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const incomeAnalysis = IncomeEngine.analyze(
      data.profile,
      data.incomeEntries
    );

    const fixedTotal = BudgetEngine.calculateFixedBillsTotal(data.fixedBills);
    const envelopeTotal = BudgetEngine.calculateEnvelopeTotal(data.budgetEnvelopes);

    const currentMonthTransactions =
      ExpenseEngine.getCurrentMonthTransactions(data.transactions);

    const spentSoFar = ExpenseEngine.sumTransactions(currentMonthTransactions);

    const expectedSpending = envelopeTotal * (dayOfMonth / daysInMonth);
    const pacingDelta = spentSoFar - expectedSpending;

    let status = "On track";

    if (pacingDelta > envelopeTotal * 0.15) {
      status = "Spending too fast";
    }

    if (pacingDelta < -envelopeTotal * 0.15) {
      status = "Under budget";
    }

    return {
      income: incomeAnalysis.safeMonthlyIncome,
      fixedTotal: Math.round(fixedTotal),
      envelopeTotal: Math.round(envelopeTotal),
      spentSoFar: Math.round(spentSoFar),
      expectedSpending: Math.round(expectedSpending),
      pacingDelta: Math.round(pacingDelta),
      status
    };
  }
};