export type DemoTransaction = {
  amountCents: number;
  type: "expense" | "income" | "saving";
  category: string;
  subcategory: string | null;
  merchant: string | null;
  purpose: string;
  occurredAt: string;
  necessity: "necessary" | "flexible" | "discretionary";
  recurring: boolean;
  originalText: string;
};

type DemoSeed = {
  profile: { name: string; currency: "MAD"; monthlyIncomeCents: number; savingsTargetCents: number; capitalCents: number; emergencyFundCents: number };
  fixedExpenses: Array<{ name: string; category: string; amountCents: number; dueDay: number }>;
  pools: Array<{ name: string; kind: string; balanceCents: number; targetCents: number | null }>;
  goals: Array<{ name: string; targetCents: number; currentCents: number; deadline: string; priority: string }>;
  transactions: DemoTransaction[];
};

const smallPurchases = [
  ["Transport", "inDrive", 24], ["Transport", "inDrive", 28], ["Transport", "inDrive", 31], ["Transport", "inDrive", 26],
  ["Transport", "inDrive", 29], ["Transport", "inDrive", 33], ["Transport", "inDrive", 27], ["Transport", "inDrive", 32],
  ["Food", "Breakfast", 20], ["Food", "Coffee", 25], ["Food", "Snack", 30], ["Food", "Breakfast", 30],
  ["Food", "Coffee", 40], ["Food", "Snack", 26], ["Food", "Breakfast", 28], ["Food", "Coffee", 24],
  ["Food", "Snack", 31], ["Food", "Breakfast", 29], ["Delivery", "Delivery fee", 20], ["Delivery", "Delivery fee", 25],
  ["Delivery", "Delivery fee", 30], ["Delivery", "Delivery fee", 35], ["Delivery", "Delivery fee", 32],
  ["Entertainment", "Mobile game", 40], ["Entertainment", "App purchase", 38], ["Entertainment", "Mobile game", 39], ["Entertainment", "App purchase", 40],
] as const;

function monthDate(reference: Date, monthOffset: number, day: number, hour = 12) {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, day, hour)).toISOString();
}

export function buildClientDemo(reference = new Date()): DemoSeed {
  const currentDay = Math.max(1, reference.getUTCDate());
  const onCurrentDay = (index: number) => monthDate(reference, 0, 1 + (index % currentDay), 8 + (index % 10));
  const onPreviousDay = (day: number) => monthDate(reference, -1, day);
  const small: DemoTransaction[] = smallPurchases.map(([category, merchant, amount], index) => ({
    amountCents: amount * 100,
    type: "expense",
    category,
    subcategory: merchant,
    merchant,
    purpose: category === "Transport" ? "Short ride" : category === "Delivery" ? "Convenience fee" : merchant,
    occurredAt: onCurrentDay(index),
    necessity: category === "Entertainment" || category === "Delivery" ? "discretionary" : "flexible",
    recurring: false,
    originalText: `${amount}dh ${merchant}`,
  }));

  const currentMajor: DemoTransaction[] = [
    { amountCents: 10_000_00, type: "income", category: "Income", subcategory: "Salary", merchant: "Employer", purpose: "Monthly salary", occurredAt: onCurrentDay(0), necessity: "necessary", recurring: true, originalText: "I received my salary, 10000dh" },
    { amountCents: 2_000_00, type: "saving", category: "Savings", subcategory: "Monthly contribution", merchant: null, purpose: "Monthly savings target", occurredAt: onCurrentDay(2), necessity: "necessary", recurring: true, originalText: "I saved 2000dh this month" },
    { amountCents: 480_00, type: "expense", category: "Groceries", subcategory: "Household food", merchant: "Marjane", purpose: "Weekly groceries", occurredAt: onCurrentDay(4), necessity: "necessary", recurring: false, originalText: "480dh groceries" },
    { amountCents: 350_00, type: "expense", category: "Transport", subcategory: "Fuel", merchant: "Afriquia", purpose: "Fuel", occurredAt: onCurrentDay(7), necessity: "necessary", recurring: false, originalText: "350dh fuel" },
    { amountCents: 199_00, type: "expense", category: "Shopping", subcategory: "Clothing", merchant: "City Mall", purpose: "Shoes", occurredAt: onCurrentDay(10), necessity: "discretionary", recurring: false, originalText: "Bought shoes for 199dh" },
    { amountCents: 340_00, type: "expense", category: "Shopping", subcategory: "Personal care", merchant: "Beauty Store", purpose: "Perfume", occurredAt: onCurrentDay(14), necessity: "discretionary", recurring: false, originalText: "340dh perfume" },
  ];

  const previous: DemoTransaction[] = [
    { amountCents: 620_00, type: "expense", category: "Groceries", subcategory: "Household food", merchant: "Marjane", purpose: "Groceries", occurredAt: onPreviousDay(4), necessity: "necessary", recurring: false, originalText: "620dh groceries" },
    { amountCents: 410_00, type: "expense", category: "Transport", subcategory: "Fuel", merchant: "Afriquia", purpose: "Fuel", occurredAt: onPreviousDay(9), necessity: "necessary", recurring: false, originalText: "410dh fuel" },
    { amountCents: 280_00, type: "expense", category: "Shopping", subcategory: "Personal", merchant: "Local shop", purpose: "Shopping", occurredAt: onPreviousDay(16), necessity: "discretionary", recurring: false, originalText: "280dh shopping" },
    { amountCents: 440_00, type: "expense", category: "Food", subcategory: "Eating out", merchant: "Restaurants", purpose: "Meals out", occurredAt: onPreviousDay(23), necessity: "flexible", recurring: false, originalText: "440dh eating out" },
  ];

  const deadline = monthDate(reference, 6, 1).slice(0, 10);
  return {
    profile: { name: "Client Demo", currency: "MAD", monthlyIncomeCents: 1_000_000, savingsTargetCents: 200_000, capitalCents: 2_000_000, emergencyFundCents: 800_000 },
    fixedExpenses: [
      { name: "Rent", category: "Housing", amountCents: 300_000, dueDay: 1 },
      { name: "Internet", category: "Utilities", amountCents: 30_000, dueDay: 10 },
      { name: "Electricity & water", category: "Utilities", amountCents: 45_000, dueDay: 15 },
      { name: "Mobile plan", category: "Subscriptions", amountCents: 15_000, dueDay: 20 },
      { name: "Insurance", category: "Insurance", amountCents: 10_000, dueDay: 5 },
    ],
    pools: [
      { name: "Emergency fund", kind: "emergency", balanceCents: 800_000, targetCents: 1_200_000 },
      { name: "General capital", kind: "general", balanceCents: 1_200_000, targetCents: null },
    ],
    goals: [
      { name: "New laptop", targetCents: 1_500_000, currentCents: 600_000, deadline, priority: "high" },
      { name: "Summer travel", targetCents: 800_000, currentCents: 250_000, deadline, priority: "medium" },
    ],
    transactions: [...currentMajor, ...small, ...previous],
  };
}
