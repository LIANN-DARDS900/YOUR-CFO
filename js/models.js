// js/models.js

const CFO_MODELS = {
  currency: "MAD",

  userTypes: [
    "student",
    "employee",
    "freelancer",
    "young_professional",
    "business_owner",
    "no_income"
  ],

  incomeTypes: [
    "fixed",
    "monthly",
    "weekly",
    "daily",
    "irregular",
    "family_support",
    "none"
  ],

  categories: [
    "Food",
    "Coffee",
    "Transport",
    "Housing",
    "Phone",
    "Internet",
    "Subscriptions",
    "Shopping",
    "Health",
    "Education",
    "Entertainment",
    "Travel",
    "Business",
    "Other"
  ],

  intents: [
    "essential",
    "lifestyle"
  ],

  flags: [
    "normal",
    "over_budget",
    "lifestyle_creep",
    "unusual",
    "money_leak"
  ]
};

function CFO_uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function CFO_today() {
  return new Date().toISOString().split("T")[0];
}

function CFO_clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}