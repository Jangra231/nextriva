CREATE TABLE `venueApprovalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`eventId` int,
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
	`capacity` int,
	`isAccessible` boolean NOT NULL DEFAULT false,
	`accessibilityNotes` text,
	`status` enum('pending','changes_requested','approved','rejected') NOT NULL DEFAULT 'pending',
	`organizerNote` text,
	`reviewNote` text,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`approvedVenueId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venueApprovalRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `venueApprovalRequests` ADD CONSTRAINT `venueApprovalRequests_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueApprovalRequests` ADD CONSTRAINT `venueApprovalRequests_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueApprovalRequests` ADD CONSTRAINT `venueApprovalRequests_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venueApprovalRequests` ADD CONSTRAINT `venueApprovalRequests_approvedVenueId_approvedVenues_id_fk` FOREIGN KEY (`approvedVenueId`) REFERENCES `approvedVenues`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `venue_request_organizer_idx` ON `venueApprovalRequests` (`organizerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `venue_request_status_idx` ON `venueApprovalRequests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `venue_request_event_idx` ON `venueApprovalRequests` (`eventId`);