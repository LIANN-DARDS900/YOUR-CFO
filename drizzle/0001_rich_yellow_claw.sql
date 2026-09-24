CREATE TABLE `ai_usage_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_usage_user_day` ON `ai_usage_daily` (`user_id`,`day`);