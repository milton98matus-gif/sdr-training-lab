CREATE TABLE `training_events` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`unit_type` text NOT NULL,
	`unit_id` text NOT NULL,
	`topic` text NOT NULL,
	`mode` text NOT NULL,
	`step` integer NOT NULL,
	`score` integer,
	`max_score` integer,
	`aligned` integer,
	`details` text NOT NULL,
	`client_at` integer,
	`recorded_at` integer NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `training_event_user_date` ON `training_events` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `training_event_topic_date` ON `training_events` (`topic`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `training_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_role_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`previous_role` text NOT NULL,
	`new_role` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_snapshots` (
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `scope`)
);
