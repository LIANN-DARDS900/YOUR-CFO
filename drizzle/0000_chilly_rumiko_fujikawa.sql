CREATE TABLE `ai_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`evidence_json` text NOT NULL,
	`provider` text NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`name` text NOT NULL,
	`icon` text DEFAULT 'Wallet' NOT NULL,
	`color` text DEFAULT '#0f766e' NOT NULL,
	`system` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_categories_profile` ON `categories` (`profile_id`);--> statement-breakpoint
CREATE TABLE `decision_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_id` text NOT NULL,
	`name` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`decision_id`) REFERENCES `financial_decisions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `financial_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`mode` text NOT NULL,
	`title` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `financial_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'personal' NOT NULL,
	`currency` text DEFAULT 'MAD' NOT NULL,
	`monthly_income_cents` integer DEFAULT 0 NOT NULL,
	`monthly_savings_target_cents` integer DEFAULT 0 NOT NULL,
	`capital_cents` integer DEFAULT 0 NOT NULL,
	`emergency_fund_cents` integer DEFAULT 0 NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fixed_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_day` integer,
	`recurring` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`current_cents` integer DEFAULT 0 NOT NULL,
	`deadline` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`frequency` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `monthly_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`month` text NOT NULL,
	`income_cents` integer NOT NULL,
	`spent_cents` integer NOT NULL,
	`saved_cents` integer NOT NULL,
	`leakage_cents` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_snapshot_profile_month` ON `monthly_snapshots` (`profile_id`,`month`);--> statement-breakpoint
CREATE TABLE `profile_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_profile_user` ON `profile_memberships` (`profile_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_user` ON `profile_memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `savings_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`pool_id` text,
	`amount_cents` integer NOT NULL,
	`contributed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pool_id`) REFERENCES `savings_pools`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `savings_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`balance_cents` integer DEFAULT 0 NOT NULL,
	`target_cents` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`merchant` text,
	`purpose` text,
	`occurred_at` text NOT NULL,
	`necessity` text NOT NULL,
	`recurring` integer DEFAULT false NOT NULL,
	`confidence_bps` integer DEFAULT 7000 NOT NULL,
	`original_text` text NOT NULL,
	`source` text DEFAULT 'local' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `financial_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_profile_date` ON `transactions` (`profile_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_profile_type` ON `transactions` (`profile_id`,`type`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
