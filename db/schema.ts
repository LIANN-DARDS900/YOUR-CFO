import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  ...timestamps,
});

export const financialProfiles = sqliteTable("financial_profiles", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["personal", "shared"] }).notNull().default("personal"),
  currency: text("currency").notNull().default("MAD"),
  monthlyIncomeCents: integer("monthly_income_cents").notNull().default(0),
  monthlySavingsTargetCents: integer("monthly_savings_target_cents").notNull().default(0),
  capitalCents: integer("capital_cents").notNull().default(0),
  emergencyFundCents: integer("emergency_fund_cents").notNull().default(0),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export const profileMemberships = sqliteTable("profile_memberships", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "member", "viewer"] }).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("idx_membership_profile_user").on(t.profileId, t.userId), index("idx_membership_user").on(t.userId)]);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").references(() => financialProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Wallet"),
  color: text("color").notNull().default("#0f766e"),
  system: integer("system", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (t) => [index("idx_categories_profile").on(t.profileId)]);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  type: text("type", { enum: ["expense", "income", "saving"] }).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  merchant: text("merchant"),
  purpose: text("purpose"),
  occurredAt: text("occurred_at").notNull(),
  necessity: text("necessity", { enum: ["necessary", "flexible", "discretionary"] }).notNull(),
  recurring: integer("recurring", { mode: "boolean" }).notNull().default(false),
  confidenceBps: integer("confidence_bps").notNull().default(7000),
  originalText: text("original_text").notNull(),
  source: text("source").notNull().default("local"),
  ...timestamps,
}, (t) => [index("idx_transactions_profile_date").on(t.profileId, t.occurredAt), index("idx_transactions_profile_type").on(t.profileId, t.type)]);

export const incomes = sqliteTable("incomes", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(), amountCents: integer("amount_cents").notNull(), frequency: text("frequency").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
});

export const fixedExpenses = sqliteTable("fixed_expenses", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(), category: text("category").notNull(), amountCents: integer("amount_cents").notNull(), dueDay: integer("due_day"), recurring: integer("recurring", { mode: "boolean" }).notNull().default(true), active: integer("active", { mode: "boolean" }).notNull().default(true), ...timestamps,
});

export const savingsPools = sqliteTable("savings_pools", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(), kind: text("kind").notNull(), balanceCents: integer("balance_cents").notNull().default(0), targetCents: integer("target_cents"), ...timestamps,
});

export const savingsContributions = sqliteTable("savings_contributions", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  poolId: text("pool_id").references(() => savingsPools.id, { onDelete: "set null" }), amountCents: integer("amount_cents").notNull(), contributedAt: text("contributed_at").notNull(), ...timestamps,
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(), targetCents: integer("target_cents").notNull(), currentCents: integer("current_cents").notNull().default(0), deadline: text("deadline"), priority: text("priority").notNull().default("medium"), ...timestamps,
});

export const financialDecisions = sqliteTable("financial_decisions", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }), createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  mode: text("mode", { enum: ["purchase", "life_change", "emergency"] }).notNull(), title: text("title").notNull(), inputJson: text("input_json").notNull(), resultJson: text("result_json").notNull(), ...timestamps,
});

export const decisionScenarios = sqliteTable("decision_scenarios", {
  id: text("id").primaryKey(), decisionId: text("decision_id").notNull().references(() => financialDecisions.id, { onDelete: "cascade" }), name: text("name").notNull(), resultJson: text("result_json").notNull(), ...timestamps,
});

export const aiInsights = sqliteTable("ai_insights", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }), kind: text("kind").notNull(), body: text("body").notNull(), evidenceJson: text("evidence_json").notNull(), provider: text("provider").notNull(), expiresAt: text("expires_at"), ...timestamps,
});

export const aiUsageDaily = sqliteTable("ai_usage_daily", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("idx_ai_usage_user_day").on(t.userId, t.day)]);

export const monthlySnapshots = sqliteTable("monthly_snapshots", {
  id: text("id").primaryKey(), profileId: text("profile_id").notNull().references(() => financialProfiles.id, { onDelete: "cascade" }), month: text("month").notNull(), incomeCents: integer("income_cents").notNull(), spentCents: integer("spent_cents").notNull(), savedCents: integer("saved_cents").notNull(), leakageCents: integer("leakage_cents").notNull(), snapshotJson: text("snapshot_json").notNull(), ...timestamps,
}, (t) => [uniqueIndex("idx_snapshot_profile_month").on(t.profileId, t.month)]);
