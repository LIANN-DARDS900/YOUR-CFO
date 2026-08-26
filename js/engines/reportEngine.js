// js/engines/reportEngine.js
// FINAL MVP V1

const ReportEngine = {
  formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  },

  getPeriodRange(period) {
    const now = new Date();
    let start;
    let end = new Date();

    if (period === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      end = new Date();
    }

    if (period === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    if (period === "last_3_months") {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    if (period === "last_4_months") {
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDate: this.formatLocalDate(start),
      endDate: this.formatLocalDate(end)
    };
  },

  getDateRangeDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diff = end - start;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  },

  filterTransactions(transactions = [], startDate, endDate) {
    return transactions.filter(tx => {
      const date = new Date(tx.date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  },

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

  calculateProRataFixedBills(fixedBills = [], startDate, endDate) {
    const days = this.getDateRangeDays(startDate, endDate);

    return fixedBills
      .filter(bill => bill.active !== false)
      .reduce((sum, bill) => {
        const monthlyEquivalent = this.normalizeBillToMonthly(bill);
        const dailyEquivalent = monthlyEquivalent / 30;
        return sum + dailyEquivalent * days;
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

  estimateIncomeForPeriod(profile, incomeEntries = [], startDate, endDate) {
    const incomeAnalysis = IncomeEngine.analyze(profile, incomeEntries);
    const days = this.getDateRangeDays(startDate, endDate);

    const dailyIncome = incomeAnalysis.safeMonthlyIncome / 30;

    return Math.round(dailyIncome * days);
  },

  generateReport(data, period) {
    const { startDate, endDate } = this.getPeriodRange(period);

    const transactions = this.filterTransactions(
      data.transactions,
      startDate,
      endDate
    );

    const totalTransactions = transactions.reduce((sum, tx) => {
      return sum + Number(tx.amount || 0);
    }, 0);

    const proRataFixedBills = this.calculateProRataFixedBills(
      data.fixedBills,
      startDate,
      endDate
    );

    const estimatedIncome = this.estimateIncomeForPeriod(
      data.profile,
      data.incomeEntries,
      startDate,
      endDate
    );

    const totalExpenses = totalTransactions + proRataFixedBills;
    const realSavings = estimatedIncome - totalExpenses;

    return {
      period,
      startDate,
      endDate,
      estimatedIncome: Math.round(estimatedIncome),
      transactionSpending: Math.round(totalTransactions),
      proRataFixedBills: Math.round(proRataFixedBills),
      totalExpenses: Math.round(totalExpenses),
      realSavings: Math.round(realSavings),
      byCategory: this.groupByCategory(transactions),
      byIntent: this.groupByIntent(transactions),
      transactions
    };
  }
};
