ALTER TABLE `rooms` ADD `guest_user_id` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `time_control_minutes` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `time_control_increment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `host_color` text DEFAULT 'random' NOT NULL;