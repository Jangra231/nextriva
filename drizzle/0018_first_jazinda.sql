CREATE TABLE `venueFilterPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`query` varchar(120),
	`zone` varchar(100),
	`ward` varchar(100),
	`minimumCapacity` int,
	`accessibility` enum('all','accessible','standard') NOT NULL DEFAULT 'all',
	`radiusKm` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venueFilterPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `venueFilterPresets` ADD CONSTRAINT `venueFilterPresets_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `venue_filter_presets_organizer_idx` ON `venueFilterPresets` (`organizerId`,`updatedAt`);