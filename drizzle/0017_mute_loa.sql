ALTER TABLE `approvedVenues` ADD `capacity` int;--> statement-breakpoint
ALTER TABLE `approvedVenues` ADD `isAccessible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `approvedVenues` ADD `accessibilityNotes` text;--> statement-breakpoint
ALTER TABLE `events` ADD `venueCapacity` int;--> statement-breakpoint
ALTER TABLE `events` ADD `venueIsAccessible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `venueAccessibilityNotes` text;