CREATE TABLE `csrCapabilitySponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`requestId` int NOT NULL,
	`fundingStatus` enum('pending','committed','funded','complete','cancelled') NOT NULL DEFAULT 'pending',
	`transactionReference` varchar(160),
	`transactionDate` timestamp,
	`fundingRecordedAt` timestamp,
	`reportSummary` text,
	`reportRecordedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrCapabilitySponsorships_id` PRIMARY KEY(`id`),
	CONSTRAINT `csrCapabilitySponsorships_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `csrCapabilitySponsorships_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `csrEventAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`sponsorshipId` int NOT NULL,
	`eventId` int,
	`futureEventConceptId` int,
	`approvedParticipantFields` json,
	`assignmentNote` text NOT NULL,
	`status` enum('assigned','completed','cancelled') NOT NULL DEFAULT 'assigned',
	`assignedByAdminId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrEventAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `csrEventAssignments_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `csrEventAssignments_sponsorshipId_unique` UNIQUE(`sponsorshipId`)
);
--> statement-breakpoint
CREATE TABLE `csrFutureEventConcepts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`requestId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`activityType` varchar(120) NOT NULL,
	`city` varchar(100),
	`zone` varchar(100),
	`ward` varchar(100),
	`proposedStartsAt` timestamp,
	`proposedEndsAt` timestamp,
	`notes` text NOT NULL,
	`status` enum('proposed','event_owner_requested','converted','cancelled') NOT NULL DEFAULT 'proposed',
	`createdByAdminId` int NOT NULL,
	`convertedEventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrFutureEventConcepts_id` PRIMARY KEY(`id`),
	CONSTRAINT `csrFutureEventConcepts_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `csrFutureEventConcepts_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `userWorkspacePreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`defaultView` enum('participant','organizer','capability') NOT NULL DEFAULT 'participant',
	`defaultCapabilityGrantId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userWorkspacePreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userWorkspacePreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD `publicId` varchar(32);--> statement-breakpoint
ALTER TABLE `csrSponsorshipRequests` ADD CONSTRAINT `csrSponsorshipRequests_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
ALTER TABLE `csrCapabilitySponsorships` ADD CONSTRAINT `csrCapabilitySponsorships_requestId_csrSponsorshipRequests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `csrSponsorshipRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrEventAssignments` ADD CONSTRAINT `csr_asg_spons_fk` FOREIGN KEY (`sponsorshipId`) REFERENCES `csrCapabilitySponsorships`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrEventAssignments` ADD CONSTRAINT `csr_asg_event_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrEventAssignments` ADD CONSTRAINT `csr_asg_concept_fk` FOREIGN KEY (`futureEventConceptId`) REFERENCES `csrFutureEventConcepts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrEventAssignments` ADD CONSTRAINT `csr_asg_admin_fk` FOREIGN KEY (`assignedByAdminId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrFutureEventConcepts` ADD CONSTRAINT `csr_concept_request_fk` FOREIGN KEY (`requestId`) REFERENCES `csrSponsorshipRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrFutureEventConcepts` ADD CONSTRAINT `csr_concept_admin_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrFutureEventConcepts` ADD CONSTRAINT `csr_concept_event_fk` FOREIGN KEY (`convertedEventId`) REFERENCES `events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userWorkspacePreferences` ADD CONSTRAINT `workspace_pref_grant_fk` FOREIGN KEY (`defaultCapabilityGrantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userWorkspacePreferences` ADD CONSTRAINT `workspace_preference_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `csr_capability_sponsorship_funding_idx` ON `csrCapabilitySponsorships` (`fundingStatus`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `csr_assignment_event_idx` ON `csrEventAssignments` (`eventId`);--> statement-breakpoint
CREATE INDEX `csr_assignment_concept_idx` ON `csrEventAssignments` (`futureEventConceptId`);--> statement-breakpoint
CREATE INDEX `csr_assignment_status_idx` ON `csrEventAssignments` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `csr_future_concept_status_idx` ON `csrFutureEventConcepts` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `csr_future_concept_territory_idx` ON `csrFutureEventConcepts` (`city`,`zone`,`ward`);--> statement-breakpoint
CREATE INDEX `workspace_preference_grant_idx` ON `userWorkspacePreferences` (`defaultCapabilityGrantId`);
--> statement-breakpoint
INSERT IGNORE INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'CSR_ASSIGNED_EVENT_VIEW', 'View assigned sponsored events', 'View only events or future concepts assigned by a platform administrator to this CSR request.', false, JSON_ARRAY('CSR_BRIEF_SUBMIT'), false, true, 30 FROM `capabilities` WHERE `code` = 'CSR_SPONSORSHIP';
--> statement-breakpoint
INSERT IGNORE INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'CSR_ASSIGNED_PARTICIPANT_VIEW', 'View approved assigned-event participants', 'View only administrator-approved participant fields for a specifically assigned CSR event.', false, JSON_ARRAY('CSR_ASSIGNED_EVENT_VIEW'), true, true, 40 FROM `capabilities` WHERE `code` = 'CSR_SPONSORSHIP';
--> statement-breakpoint
INSERT IGNORE INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'CSR_FUNDING_TRACK', 'Track approved funding', 'View funding status, recorded transaction evidence, and completion status for assigned CSR sponsorships.', false, JSON_ARRAY('CSR_BRIEF_SUBMIT'), false, true, 50 FROM `capabilities` WHERE `code` = 'CSR_SPONSORSHIP';
