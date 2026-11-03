-- Migration: Governance, Centralized Audit Trail, Profile Change Requests and User Status
CREATE TABLE IF NOT EXISTS `training_audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `actor_id` text NOT NULL,
  `actor_name` text NOT NULL,
  `actor_role` text NOT NULL,
  `target_id` text,
  `action` text NOT NULL,
  `details` text,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `training_profile_change_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `user_name` text NOT NULL,
  `user_email` text NOT NULL,
  `field_name` text NOT NULL,
  `current_value` text,
  `proposed_value` text NOT NULL,
  `reason` text,
  `status` text NOT NULL DEFAULT 'pending',
  `admin_notes` text,
  `reviewed_by` text,
  `reviewed_at` integer,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_audit_created` ON `training_audit_log` (`created_at` DESC);
CREATE INDEX IF NOT EXISTS `idx_audit_action` ON `training_audit_log` (`action`);
CREATE INDEX IF NOT EXISTS `idx_audit_target` ON `training_audit_log` (`target_id`);
CREATE INDEX IF NOT EXISTS `idx_profile_req_user` ON `training_profile_change_requests` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_profile_req_status` ON `training_profile_change_requests` (`status`);

ALTER TABLE `training_user_credentials` ADD COLUMN `is_active` integer NOT NULL DEFAULT 1;
ALTER TABLE `training_profiles` ADD COLUMN `is_active` integer NOT NULL DEFAULT 1;
