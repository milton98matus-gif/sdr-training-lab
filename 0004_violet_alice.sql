CREATE TABLE `training_game_runs` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`mission_id` text NOT NULL,
	`version` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `training_game_user_date` ON `training_game_runs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `training_msp_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_msp_accounts_normalized_name_unique` ON `training_msp_accounts` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `training_participant_details` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`requested_msp_id` text,
	`approved_msp_id` text,
	`verified_at` integer,
	`verified_by` text,
	`tour_completed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_section_time_buckets` (
	`user_id` text NOT NULL,
	`section` text NOT NULL,
	`bucket_start` integer NOT NULL,
	`connected_mask` integer NOT NULL,
	`visible_mask` integer NOT NULL,
	`interaction_mask` integer NOT NULL,
	`connected_seconds` integer GENERATED ALWAYS AS (((connected_mask >> 0) & 1) + ((connected_mask >> 1) & 1) + ((connected_mask >> 2) & 1) + ((connected_mask >> 3) & 1) + ((connected_mask >> 4) & 1) + ((connected_mask >> 5) & 1) + ((connected_mask >> 6) & 1) + ((connected_mask >> 7) & 1) + ((connected_mask >> 8) & 1) + ((connected_mask >> 9) & 1) + ((connected_mask >> 10) & 1) + ((connected_mask >> 11) & 1) + ((connected_mask >> 12) & 1) + ((connected_mask >> 13) & 1) + ((connected_mask >> 14) & 1) + ((connected_mask >> 15) & 1) + ((connected_mask >> 16) & 1) + ((connected_mask >> 17) & 1) + ((connected_mask >> 18) & 1) + ((connected_mask >> 19) & 1) + ((connected_mask >> 20) & 1) + ((connected_mask >> 21) & 1) + ((connected_mask >> 22) & 1) + ((connected_mask >> 23) & 1) + ((connected_mask >> 24) & 1) + ((connected_mask >> 25) & 1) + ((connected_mask >> 26) & 1) + ((connected_mask >> 27) & 1) + ((connected_mask >> 28) & 1) + ((connected_mask >> 29) & 1)) STORED,
	`visible_seconds` integer GENERATED ALWAYS AS (((visible_mask >> 0) & 1) + ((visible_mask >> 1) & 1) + ((visible_mask >> 2) & 1) + ((visible_mask >> 3) & 1) + ((visible_mask >> 4) & 1) + ((visible_mask >> 5) & 1) + ((visible_mask >> 6) & 1) + ((visible_mask >> 7) & 1) + ((visible_mask >> 8) & 1) + ((visible_mask >> 9) & 1) + ((visible_mask >> 10) & 1) + ((visible_mask >> 11) & 1) + ((visible_mask >> 12) & 1) + ((visible_mask >> 13) & 1) + ((visible_mask >> 14) & 1) + ((visible_mask >> 15) & 1) + ((visible_mask >> 16) & 1) + ((visible_mask >> 17) & 1) + ((visible_mask >> 18) & 1) + ((visible_mask >> 19) & 1) + ((visible_mask >> 20) & 1) + ((visible_mask >> 21) & 1) + ((visible_mask >> 22) & 1) + ((visible_mask >> 23) & 1) + ((visible_mask >> 24) & 1) + ((visible_mask >> 25) & 1) + ((visible_mask >> 26) & 1) + ((visible_mask >> 27) & 1) + ((visible_mask >> 28) & 1) + ((visible_mask >> 29) & 1)) STORED,
	`interaction_seconds` integer GENERATED ALWAYS AS (((interaction_mask >> 0) & 1) + ((interaction_mask >> 1) & 1) + ((interaction_mask >> 2) & 1) + ((interaction_mask >> 3) & 1) + ((interaction_mask >> 4) & 1) + ((interaction_mask >> 5) & 1) + ((interaction_mask >> 6) & 1) + ((interaction_mask >> 7) & 1) + ((interaction_mask >> 8) & 1) + ((interaction_mask >> 9) & 1) + ((interaction_mask >> 10) & 1) + ((interaction_mask >> 11) & 1) + ((interaction_mask >> 12) & 1) + ((interaction_mask >> 13) & 1) + ((interaction_mask >> 14) & 1) + ((interaction_mask >> 15) & 1) + ((interaction_mask >> 16) & 1) + ((interaction_mask >> 17) & 1) + ((interaction_mask >> 18) & 1) + ((interaction_mask >> 19) & 1) + ((interaction_mask >> 20) & 1) + ((interaction_mask >> 21) & 1) + ((interaction_mask >> 22) & 1) + ((interaction_mask >> 23) & 1) + ((interaction_mask >> 24) & 1) + ((interaction_mask >> 25) & 1) + ((interaction_mask >> 26) & 1) + ((interaction_mask >> 27) & 1) + ((interaction_mask >> 28) & 1) + ((interaction_mask >> 29) & 1)) STORED,
	PRIMARY KEY(`user_id`, `section`, `bucket_start`)
);
