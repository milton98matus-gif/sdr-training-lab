CREATE TABLE IF NOT EXISTS `training_user_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text UNIQUE NOT NULL,
	`display_name` text NOT NULL,
	`organization` text DEFAULT 'OSR Manage' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`verification_code` text,
	`verification_code_expires` integer,
	`reset_requested` integer DEFAULT 0 NOT NULL,
	`reset_requested_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `training_user_credentials_email` ON `training_user_credentials` (`email`);
