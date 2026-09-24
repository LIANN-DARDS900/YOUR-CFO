export type ParsedTransaction = {
  amountCents: number; currency: string; type: "expense" | "income" | "saving"; category: string; subcategory: string | null;
  merchant: string | null; purpose: string | null; occurredAt: string; necessity: "necessary" | "flexible" | "discretionary";
  recurring: boolean; confidenceBps: number; originalText: string; source: "local";
};

const rules = [
  { words: ["rent", "loyer"], category: "Housing", necessity: "necessary" as const, recurring: true },
  { words: ["indrive", "uber", "careem", "taxi", "tram"], category: "Transport", necessity: "flexible" as const, recurring: false },
  { words: ["breakfast", "coffee", "café", "snack", "biscuit", "pizza", "lunch", "dinner", "food"], category: "Food", necessity: "flexible" as const, recurring: false },
  { words: ["game", "gaming", "steam", "app"], category: "Entertainment", necessity: "discretionary" as const, recurring: false },
  { words: ["shoes", "perfume", "clothes", "shopping"], category: "Shopping", necessity: "discretionary" as const, recurring: false },
  { words: ["internet", "netflix", "spotify", "subscription"], category: "Subscriptions", necessity: "flexible" as const, recurring: true },
  { words: ["doctor", "medicine", "urgent", "emergency"], category: "Health", necessity: "necessary" as const, recurring: false },
];

export function parseNaturalTransaction(text: string, now = new Date()): ParsedTransaction {
  const clean = text.trim();
  const amountMatch = clean.match(/(?:^|\s)(\d+(?:[.,]\d{1,2})?)\s*(?:dh|mad|dhs)?\b/i) ?? clean.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!amountMatch) throw new Error("I couldn't find an amount. Try “13dh inDrive”.");
  const amountCents = Math.round(Number(amountMatch[1].replace(",", ".")) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000_00) throw new Error("Enter a valid positive amount.");
  const lower = clean.toLowerCase();
  const type = /salary|received|income|paid me|salaire/.test(lower) ? "income" : /\bsav(?:e|ed|ing)|épargn/.test(lower) ? "saving" : "expense";
  const rule = rules.find((item) => item.words.some((word) => lower.includes(word)));
  const occurred = new Date(now);
  if (/yesterday|hier/.test(lower)) occurred.setDate(occurred.getDate() - 1);
  const hour = /morning|matin/.test(lower) ? 8 : /evening|soir/.test(lower) ? 19 : now.getHours();
  occurred.setHours(hour, 0, 0, 0);
  const category = type === "income" ? "Income" : type === "saving" ? "Savings" : rule?.category ?? "Other";
  const necessity = type !== "expense" ? "necessary" : rule?.necessity ?? "flexible";
  const merchant = ["indrive", "uber", "careem", "steam", "netflix", "spotify"].find((m) => lower.includes(m)) ?? null;
  return { amountCents, currency: /\b(?:eur|€)\b/i.test(clean) ? "EUR" : /\b(?:usd|\$)\b/i.test(clean) ? "USD" : "MAD", type, category, subcategory: rule?.words.find((w) => lower.includes(w)) ?? null, merchant, purpose: clean.replace(amountMatch[0], "").replace(/\b(add|bought|for|this|morning|yesterday|i|received|my)\b/gi, " ").replace(/\s+/g, " ").trim() || null, occurredAt: occurred.toISOString(), necessity, recurring: rule?.recurring ?? false, confidenceBps: rule || type !== "expense" ? 9200 : 6200, originalText: clean, source: "local" };
}

export function parseNaturalTransactions(text: string, now = new Date()): ParsedTransaction[] {
  const clean = text.trim();
  if (!clean) throw new Error("Tell me what happened first.");
  const segments = clean.split(/[,;\n]+/).map((segment) => segment.trim()).filter(Boolean);
  if (segments.length > 20) throw new Error("Add up to 20 transactions at a time.");
  const candidates = segments.length > 1 && segments.every((segment) => /\d/.test(segment)) ? segments : [clean];
  return candidates.map((segment) => parseNaturalTransaction(segment, now));
}
