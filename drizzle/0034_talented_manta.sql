CREATE TABLE `capabilityGrantReminderDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`reminderWindow` varchar(16) NOT NULL,
	`notificationId` int,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityGrantReminderDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `grant_reminder_delivery_unique` UNIQUE(`grantId`,`recipientUserId`,`reminderWindow`)
);
--> statement-breakpoint
CREATE TABLE `participantHistoryAuditRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int,
	`correctionId` int,
	`grantId` int,
	`actorUserId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`context` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participantHistoryAuditRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participantHistoryConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`healthConsentGranted` boolean NOT NULL DEFAULT false,
	`policyVersion` varchar(32) NOT NULL DEFAULT 'stage10-v1',
	`grantedAt` timestamp,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participantHistoryConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `participantHistoryConsents_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `participantHistoryCorrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`originalEntryId` int NOT NULL,
	`userId` int NOT NULL,
	`reason` text NOT NULL,
	`correctedPayload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participantHistoryCorrections_id` PRIMARY KEY(`id`),
	CONSTRAINT `participantHistoryCorrections_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `participantHistoryEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`registrationId` int NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`categorySlug` varchar(90) NOT NULL,
	`entryType` enum('health','education','community','experience') NOT NULL,
	`entryDate` varchar(10) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participantHistoryEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `participantHistoryEntries_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `history_entry_daily_unique` UNIQUE(`registrationId`,`entryType`,`entryDate`)
);
--> statement-breakpoint
ALTER TABLE `capabilityGrantReminderDeliveries` ADD CONSTRAINT `gr_reminder_grant_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrantReminderDeliveries` ADD CONSTRAINT `gr_reminder_user_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrantReminderDeliveries` ADD CONSTRAINT `gr_reminder_notice_fk` FOREIGN KEY (`notificationId`) REFERENCES `capabilityDecisionNotifications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryAuditRecords` ADD CONSTRAINT `hist_audit_entry_fk` FOREIGN KEY (`entryId`) REFERENCES `participantHistoryEntries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryAuditRecords` ADD CONSTRAINT `hist_audit_correction_fk` FOREIGN KEY (`correctionId`) REFERENCES `participantHistoryCorrections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryAuditRecords` ADD CONSTRAINT `hist_audit_grant_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryAuditRecords` ADD CONSTRAINT `hist_audit_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryConsents` ADD CONSTRAINT `hist_consent_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryCorrections` ADD CONSTRAINT `hist_correction_entry_fk` FOREIGN KEY (`originalEntryId`) REFERENCES `participantHistoryEntries`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryCorrections` ADD CONSTRAINT `hist_correction_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryEntries` ADD CONSTRAINT `hist_entry_registration_fk` FOREIGN KEY (`registrationId`) REFERENCES `registrations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryEntries` ADD CONSTRAINT `hist_entry_event_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participantHistoryEntries` ADD CONSTRAINT `hist_entry_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `grant_reminder_delivery_recipient_idx` ON `capabilityGrantReminderDeliveries` (`recipientUserId`,`deliveredAt`);--> statement-breakpoint
CREATE INDEX `history_audit_entry_idx` ON `participantHistoryAuditRecords` (`entryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_audit_grant_idx` ON `participantHistoryAuditRecords` (`grantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_audit_actor_idx` ON `participantHistoryAuditRecords` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_consent_granted_idx` ON `participantHistoryConsents` (`healthConsentGranted`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `history_correction_entry_idx` ON `participantHistoryCorrections` (`originalEntryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_correction_user_idx` ON `participantHistoryCorrections` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_entry_user_created_idx` ON `participantHistoryEntries` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `history_entry_event_date_idx` ON `participantHistoryEntries` (`eventId`,`entryDate`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'LA_HEALTH_AGGREGATE_VIEW', 'View scoped aggregate health history', 'View and export only aggregate, masked Stage 10 participant health-history counts within the exact Local Authority grant scope.', false, JSON_ARRAY('LA_TERRITORY_MONITOR'), true, true, 90 FROM `capabilities` WHERE `code` = 'LOCAL_AUTHORITY' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'DISTRICT_HEALTH_AGGREGATE_VIEW', 'View district aggregate health history', 'View and export only aggregate, masked Stage 10 participant health-history counts within the exact District-Level grant scope.', false, JSON_ARRAY('DISTRICT_DELIVERY_MONITOR'), true, true, 90 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'STATE_HEALTH_AGGREGATE_VIEW', 'View state aggregate health history', 'View and export only aggregate, masked Stage 10 participant health-history counts within the exact State-Level grant scope.', false, JSON_ARRAY('STATE_COVERAGE_VIEW'), true, true, 90 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
