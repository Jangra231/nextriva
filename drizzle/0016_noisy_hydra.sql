CREATE TABLE `approvedVenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zone` varchar(100) NOT NULL,
	`ward` varchar(100) NOT NULL,
	`location` varchar(160) NOT NULL,
	`venueName` varchar(160) NOT NULL,
	`city` varchar(100) NOT NULL,
	`address` text,
	`sector` varchar(100),
	`area` varchar(120),
	`latitudeE6` int NOT NULL,
	`longitudeE6` int NOT NULL,
	`setting` enum('indoor','outdoor') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvedVenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `locationSource` enum('manual','directory') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `approvedVenueId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `zone` varchar(100);--> statement-breakpoint
ALTER TABLE `events` ADD `ward` varchar(100);--> statement-breakpoint
ALTER TABLE `events` ADD `sector` varchar(100);--> statement-breakpoint
ALTER TABLE `events` ADD `area` varchar(120);--> statement-breakpoint
ALTER TABLE `events` ADD `latitudeE6` int;--> statement-breakpoint
ALTER TABLE `events` ADD `longitudeE6` int;--> statement-breakpoint
ALTER TABLE `events` ADD `venueSetting` enum('indoor','outdoor');--> statement-breakpoint
ALTER TABLE `approvedVenues` ADD CONSTRAINT `approvedVenues_createdByAdminId_users_id_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `approved_venues_active_city_idx` ON `approvedVenues` (`active`,`city`);--> statement-breakpoint
CREATE INDEX `approved_venues_location_idx` ON `approvedVenues` (`location`,`venueName`);--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_approvedVenueId_approvedVenues_id_fk` FOREIGN KEY (`approvedVenueId`) REFERENCES `approvedVenues`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `events_approved_venue_idx` ON `events` (`approvedVenueId`);