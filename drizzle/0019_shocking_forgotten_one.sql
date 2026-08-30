CREATE TABLE `venueAvailabilityNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`venueId` int,
	`releasedEventId` int,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venueAvailabilityNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venueAvailabilitySubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`venueId` int NOT NULL,
	`eventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venueAvailabilitySubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `venue_availability_subscription_unique` UNIQUE(`organizerId`,`venueId`)
);
--> statement-breakpoint
ALTER TABLE `venueAvailabilityNotifications` ADD CONSTRAINT `venueAvailabilityNotifications_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueAvailabilityNotifications` ADD CONSTRAINT `venueAvailabilityNotifications_venueId_approvedVenues_id_fk` FOREIGN KEY (`venueId`) REFERENCES `approvedVenues`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueAvailabilityNotifications` ADD CONSTRAINT `venueAvailabilityNotifications_releasedEventId_events_id_fk` FOREIGN KEY (`releasedEventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueAvailabilitySubscriptions` ADD CONSTRAINT `venueAvailabilitySubscriptions_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueAvailabilitySubscriptions` ADD CONSTRAINT `venueAvailabilitySubscriptions_venueId_approvedVenues_id_fk` FOREIGN KEY (`venueId`) REFERENCES `approvedVenues`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueAvailabilitySubscriptions` ADD CONSTRAINT `venueAvailabilitySubscriptions_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `venue_availability_notification_organizer_idx` ON `venueAvailabilityNotifications` (`organizerId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `venue_availability_subscription_venue_idx` ON `venueAvailabilitySubscriptions` (`venueId`);