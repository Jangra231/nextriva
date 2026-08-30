CREATE TABLE `csrSponsorshipRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`csrProfileId` int NOT NULL,
	`budgetId` int NOT NULL,
	`requestKind` enum('existing_event','future_event') NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`titlePreference` varchar(180),
	`intendedAudience` varchar(220) NOT NULL,
	`cityPreference` varchar(100),
	`zonePreference` varchar(100),
	`wardPreference` varchar(100),
	`preferredStartDate` timestamp,
	`preferredEndDate` timestamp,
	`estimatedCapacity` int,
	`accessibilityNeeds` text,
	`successIndicators` text,
	`details` text NOT NULL,
	`amountPaise` int NOT NULL,
	`status` enum('draft','submitted','changes_requested','approved_pending_assignment','rejected','assigned','cancelled') NOT NULL DEFAULT 'draft',
	`csrSubmissionNote` text,
	`adminReviewNote` text,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`assignedEventId` int,
	`assignedByAdminId` int,
	`assignedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrSponsorshipRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_csrProfileId_csrProfiles_id_fk` FOREIGN KEY (`csrProfileId`) REFERENCES `csrProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_budgetId_csrBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `csrBudgets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_assignedEventId_events_id_fk` FOREIGN KEY (`assignedEventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_assignedByAdminId_users_id_fk` FOREIGN KEY (`assignedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `csr_request_profile_idx` ON `csrSponsorshipRequests` (`csrProfileId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `csr_request_status_idx` ON `csrSponsorshipRequests` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `csr_request_assigned_event_idx` ON `csrSponsorshipRequests` (`assignedEventId`);