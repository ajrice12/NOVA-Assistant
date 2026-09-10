ALTER TABLE `source_items` ADD `content` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_items` ADD `summary_strategy` text DEFAULT 'extractive' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_items` ADD `model_call_count` integer DEFAULT 0 NOT NULL;