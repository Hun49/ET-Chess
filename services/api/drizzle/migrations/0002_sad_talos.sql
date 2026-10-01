CREATE TABLE `game_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`white_user_id` text NOT NULL,
	`black_user_id` text NOT NULL,
	`result` text NOT NULL,
	`rating_delta_white` integer NOT NULL,
	`rating_delta_black` integer NOT NULL,
	`settled_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_settlements_game_id_unique` ON `game_settlements` (`game_id`);--> statement-breakpoint
ALTER TABLE `rooms` ADD `white_user_id` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `black_user_id` text;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `host_user_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'user' NOT NULL;