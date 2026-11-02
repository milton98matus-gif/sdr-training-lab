CREATE TABLE `training_ai_reviews` (
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`event_id` text NOT NULL,
	`context_key` text NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`model` text NOT NULL,
	`review_version` text NOT NULL,
	`error_code` text,
	`claim_id` text NOT NULL,
	`attempts` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	PRIMARY KEY(`user_id`, `source`, `event_id`, `context_key`)
);
--> statement-breakpoint
CREATE INDEX `training_ai_user_date` ON `training_ai_reviews` (`user_id`,`updated_at`);