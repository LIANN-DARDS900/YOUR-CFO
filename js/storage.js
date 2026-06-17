// js/storage.js

const CFO_STORAGE_KEY = "your_cfo_data_v1";

const CFO_DEFAULT_DATA = {
  profile: null,
  incomeEntries: [],
  fixedBills: [],
  budgetEnvelopes: [],
  transactions: [],
  goals: []
};

const CFOStorage = {
  load() {
    const raw = localStorage.getItem(CFO_STORAGE_KEY);

    if (!raw) {
      this.save(CFO_DEFAULT_DATA);
      return structuredClone(CFO_DEFAULT_DATA);
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Storage parse error:", error);
      this.save(CFO_DEFAULT_DATA);
      return structuredClone(CFO_DEFAULT_DATA);
    }
  },

  save(data) {
    localStorage.setItem(CFO_STORAGE_KEY, JSON.stringify(data));
  },

  reset() {
    localStorage.removeItem(CFO_STORAGE_KEY);
    this.save(CFO_DEFAULT_DATA);
  },

  setProfile(profile) {
    const data = this.load();
    data.profile = {
      id: profile.id || CFO_uid("profile"),
      name: profile.name || "User",
      userType: profile.userType || "employee",
      incomeType: profile.incomeType || "monthly",
      baseIncomeAmount: Number(profile.baseIncomeAmount || 0),
      currency: profile.currency || "MAD",
      riskTolerance: profile.riskTolerance || "medium",
      createdAt: profile.createdAt || new Date().toISOString()
    };

    this.save(data);
    return data.profile;
  },

  addIncome(entry) {
    const data = this.load();

    const item = {
      id: CFO_uid("inc"),
      source: entry.source || "Income",
      amount: Number(entry.amount || 0),
      frequency: entry.frequency || "monthly",
      date: entry.date || CFO_today(),
      isRecurring: Boolean(entry.isRecurring),
      createdAt: new Date().toISOString()
    };

    data.incomeEntries.push(item);
    this.save(data);
    return item;
  },

  addFixedBill(bill) {
    const data = this.load();

    const item = {
      id: CFO_uid("bill"),
      name: bill.name || "Fixed bill",
      amount: Number(bill.amount || 0),
      category: bill.category || "Other",
      frequency: bill.frequency || "monthly",
      dueDay: Number(bill.dueDay || 1),
      active: bill.active !== false,
      createdAt: new Date().toISOString()
    };

    data.fixedBills.push(item);
    this.save(data);
    return item;
  },

  addBudgetEnvelope(envelope) {
    const data = this.load();

    const item = {
      id: CFO_uid("env"),
      name: envelope.name || "Budget envelope",
      allocatedAmount: Number(envelope.allocatedAmount || 0),
      category: envelope.category || "Other",
      period: envelope.period || "monthly",
      active: envelope.active !== false,
      createdAt: new Date().toISOString()
    };

    data.budgetEnvelopes.push(item);
    this.save(data);
    return item;
  },

  addTransaction(transaction) {
    const data = this.load();

    const item = {
      id: CFO_uid("tx"),
      label: transaction.label || "Expense",
      amount: Number(transaction.amount || 0),
      category: transaction.category || "Other",
      envelopeId: transaction.envelopeId || null,
      date: transaction.date || CFO_today(),
      quantity: Number(transaction.quantity || 1),
      intent: transaction.intent || "lifestyle",
      systemFlags: transaction.systemFlags || [],
      createdAt: new Date().toISOString()
    };

    data.transactions.push(item);
    this.save(data);
    return item;
  },

  addGoal(goal) {
    const data = this.load();

    const item = {
      id: CFO_uid("goal"),
      title: goal.title || "Goal",
      targetAmount: Number(goal.targetAmount || 0),
      currentAmount: Number(goal.currentAmount || 0),
      monthlyContribution: Number(goal.monthlyContribution || 0),
      priority: goal.priority || "medium",
      status: "active",
      linkedPurchase: goal.linkedPurchase || null,
      createdAt: new Date().toISOString()
    };

    data.goals.push(item);
    this.save(data);
    return item;
  }
};