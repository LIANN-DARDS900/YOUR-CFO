// js/engines/expenseEngine.js
// FINAL MVP V1 + Lifestyle Creep Detection

const ExpenseEngine = {
  getCurrentMonthTransactions(transactions = []) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    });
  },

  sumTransactions(transactions = []) {
    return transactions.reduce((sum, tx) => {
      return sum + Number(tx.amount || 0);
    }, 0);
  },

  groupByCategory(transactions = []) {
    return transactions.reduce((groups, tx) => {
      const category = tx.category || "Other";
      groups[category] = (groups[category] || 0) + Number(tx.amount || 0);
      return groups;
    }, {});
  },

  groupByIntent(transactions = []) {
    return transactions.reduce((groups, tx) => {
      const intent = tx.intent || "lifestyle";
      groups[intent] = (groups[intent] || 0) + Number(tx.amount || 0);
      return groups;
    }, {});
  },

  median(numbers = []) {
    if (!numbers.length) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  },

  daysBetween(firstDate, lastDate) {
    const first = new Date(firstDate);
    const last = new Date(lastDate);
    return Math.abs((last - first) / (1000 * 60 * 60 * 24));
  },

  detectLifestyleCreep(newTransaction, allTransactions = []) {
    const thresholds = CFO_THRESHOLDS.lifestyleCreep || {
      minEntries: 7,
      minDaysOfHistory: 14,
      medianMultiplier: 1.5
    };

    const newLabel = String(newTransaction.label || "").toLowerCase().trim();
    const newCategory = String(newTransaction.category || "").toLowerCase().trim();

    const sameHabit = allTransactions.filter(tx => {
      const sameLabel = String(tx.label || "").toLowerCase().trim() === newLabel;
      const sameCategory = String(tx.category || "").toLowerCase().trim() === newCategory;
      const notSameTransaction = tx.id !== newTransaction.id;
      const singleQuantity = Number(tx.quantity || 1) === 1;

      return sameLabel && sameCategory && notSameTransaction && singleQuantity;
    });

    if (sameHabit.length < thresholds.minEntries) {
      return null;
    }

    const sortedByDate = [...sameHabit].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    const historyDays = this.daysBetween(
      sortedByDate[0].date,
      sortedByDate[sortedByDate.length - 1].date
    );

    if (historyDays < thresholds.minDaysOfHistory) {
      return null;
    }

    if (Number(newTransaction.quantity || 1) > 1) {
      return null;
    }

    const amounts = sameHabit.map(tx => Number(tx.amount || 0));
    const medianPrice = this.median(amounts);
    const alertThreshold = medianPrice * thresholds.medianMultiplier;

    if (Number(newTransaction.amount) > alertThreshold) {
      const creepAmount = Number(newTransaction.amount) - medianPrice;
      const increasePercent = medianPrice > 0
        ? ((Number(newTransaction.amount) - medianPrice) / medianPrice) * 100
        : 0;

      return {
        type: "lifestyle_creep",
        label: newTransaction.label,
        category: newTransaction.category,
        medianPrice: Math.round(medianPrice),
        currentPrice: Number(newTransaction.amount),
        creepAmount: Math.round(creepAmount),
        increasePercent: Math.round(increasePercent),
        threshold: Math.round(alertThreshold),
        message: `You usually spend around ${Math.round(medianPrice)} MAD on ${newTransaction.label}, but this time you spent ${newTransaction.amount} MAD. This is ${Math.round(increasePercent)}% higher than your normal habit.`
      };
    }

    return null;
  },

  analyze(transactions = []) {
    const monthTransactions = this.getCurrentMonthTransactions(transactions);
    const totalMonthlyTransactions = this.sumTransactions(monthTransactions);

    return {
      monthTransactions,
      totalMonthlyTransactions: Math.round(totalMonthlyTransactions),
      byCategory: this.groupByCategory(monthTransactions),
      byIntent: this.groupByIntent(monthTransactions)
    };
  }
};