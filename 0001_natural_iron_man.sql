CREATE TABLE `training_assignments` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`due_at` integer,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_onboarding_entries` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`unit_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `training_onboarding_user_date` ON `training_onboarding_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_readiness_reviews` (
	`user_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`comment` text NOT NULL,
	`evidence_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
