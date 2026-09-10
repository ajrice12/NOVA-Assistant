CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_item_id` text,
	`severity` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`due_at` integer,
	`status` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`acknowledged_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alerts_user_dedupe` ON `alerts` (`user_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_alerts_user_status_severity` ON `alerts` (`user_id`,`status`,`severity`);--> statement-breakpoint
CREATE TABLE `audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connector_account_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`outcome` text NOT NULL,
	`requires_approval` integer NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_user_created` ON `audit_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `connector_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`external_account_id` text,
	`status` text NOT NULL,
	`permission_level` text NOT NULL,
	`granted_capabilities_json` text NOT NULL,
	`connection_reference` text,
	`last_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_connector_accounts_user_status` ON `connector_accounts` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_connector_accounts_user_provider_external` ON `connector_accounts` (`user_id`,`provider`,`external_account_id`);--> statement-breakpoint
CREATE TABLE `consent_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connector_account_id` text NOT NULL,
	`capability` text NOT NULL,
	`permission_level` text NOT NULL,
	`status` text NOT NULL,
	`granted_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_consent_account_capability` ON `consent_grants` (`connector_account_id`,`capability`);--> statement-breakpoint
CREATE INDEX `idx_consent_user_status` ON `consent_grants` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `memory_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_item_id` text NOT NULL,
	`content` text NOT NULL,
	`keywords_json` text NOT NULL,
	`sensitivity` text NOT NULL,
	`embedding_reference` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_memory_user_occurred` ON `memory_records` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memory_source_item` ON `memory_records` (`source_item_id`);--> statement-breakpoint
CREATE TABLE `planner_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_item_id` text,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text NOT NULL,
	`origin` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_item_id`) REFERENCES `source_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_planner_user_starts` ON `planner_items` (`user_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_planner_user_status` ON `planner_items` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `source_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connector_account_id` text NOT NULL,
	`source_type` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`sensitivity` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`due_at` integer,
	`starts_at` integer,
	`ends_at` integer,
	`canonical_url` text,
	`labels_json` text NOT NULL,
	`participants_json` text NOT NULL,
	`metadata_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_items_account_external` ON `source_items` (`connector_account_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_source_items_user_occurred` ON `source_items` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_source_items_user_due` ON `source_items` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`connector_account_id` text NOT NULL,
	`status` text NOT NULL,
	`cursor` text,
	`item_count` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`error_code` text,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sync_runs_account_started` ON `sync_runs` (`connector_account_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`timezone` text NOT NULL,
	`preferences_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_profiles_email` ON `user_profiles` (`email`);--> statement-breakpoint
PRAGMA optimize;
