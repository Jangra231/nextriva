CREATE TABLE `capabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`displayName` varchar(140) NOT NULL,
	`description` text NOT NULL,
	`audience` varchar(140) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `capabilities_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `capabilityApplicationFunctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`capabilityFunctionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityApplicationFunctions_id` PRIMARY KEY(`id`),
	CONSTRAINT `cap_application_function_unique` UNIQUE(`applicationId`,`capabilityFunctionId`)
);
--> statement-breakpoint
CREATE TABLE `capabilityApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userAccountProfileId` int NOT NULL,
	`capabilityId` int NOT NULL,
	`status` enum('draft','submitted','changes_requested','approved','rejected','cancelled','expired') NOT NULL DEFAULT 'draft',
	`justification` text NOT NULL,
	`requestedScopeType` enum('national','state','district','city','zone','ward') NOT NULL DEFAULT 'national',
	`requestedState` varchar(100),
	`requestedDistrict` varchar(100),
	`requestedCity` varchar(100),
	`requestedZone` varchar(100),
	`requestedWard` varchar(100),
	`requestedStartsAt` timestamp,
	`requestedEndsAt` timestamp,
	`applicantNote` text,
	`adminNote` text,
	`submittedAt` timestamp,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capabilityApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `capabilityAuditRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int,
	`grantId` int,
	`actorUserId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`beforeState` json,
	`afterState` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityAuditRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `capabilityFunctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`capabilityId` int NOT NULL,
	`code` varchar(96) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capabilityFunctions_id` PRIMARY KEY(`id`),
	CONSTRAINT `capabilityFunctions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
INSERT INTO `capabilities` (`code`, `displayName`, `description`, `audience`, `active`, `sortOrder`) VALUES
  ('LOCAL_AUTHORITY', 'Local Authority monitoring', 'Monitored public-health event lifecycle, territory activity, and MIS capabilities. This catalog record does not replace the retained Local Authority compatibility route.', 'Government and public-health authority teams', true, 10),
  ('CSR_SPONSORSHIP', 'CSR sponsorship stewardship', 'Corporate sponsorship brief, assigned-event impact, and reporting capabilities.', 'Corporate CSR and foundation teams', true, 20),
  ('VENUE_STEWARD', 'Venue stewardship', 'Approved venue readiness, availability, and operational coordination capabilities.', 'Venue and civic operations teams', true, 30),
  ('EVENT_HOST', 'Event hosting', 'Event lifecycle, participant experience, and event reporting capabilities.', 'Community organisers and event teams', true, 40)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `audience` = VALUES(`audience`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'LA_EVENT_REVIEW', 'Review submitted events', 'Review submitted events and record lifecycle decisions within an approved scope.', true, 10 FROM `capabilities` WHERE `code` = 'LOCAL_AUTHORITY'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'LA_TERRITORY_MONITOR', 'Monitor territory activity', 'Review activity, location, participation, and underserved-area signals within an approved scope.', true, 20 FROM `capabilities` WHERE `code` = 'LOCAL_AUTHORITY'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'LA_MIS_EXPORT', 'Export Local Authority MIS', 'Download authorized aggregate monitoring reports within an approved scope.', true, 30 FROM `capabilities` WHERE `code` = 'LOCAL_AUTHORITY'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'CSR_BRIEF_SUBMIT', 'Submit sponsorship briefs', 'Prepare and submit scoped CSR sponsorship briefs for administrator review.', true, 10 FROM `capabilities` WHERE `code` = 'CSR_SPONSORSHIP'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'CSR_IMPACT_VIEW', 'View assigned-event impact', 'Review impact only for administrator-assigned CSR-supported events.', true, 20 FROM `capabilities` WHERE `code` = 'CSR_SPONSORSHIP'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'VENUE_AVAILABILITY_MONITOR', 'Monitor venue availability', 'Review availability and readiness information for approved venue operations.', true, 10 FROM `capabilities` WHERE `code` = 'VENUE_STEWARD'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'EVENT_LIFECYCLE_MANAGE', 'Manage event lifecycle', 'Prepare, submit, and manage owned event lifecycle records.', true, 10 FROM `capabilities` WHERE `code` = 'EVENT_HOST'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `active`, `sortOrder`) SELECT `id`, 'EVENT_PARTICIPATION_REPORT', 'Review event participation', 'Review authorized participant and attendance reporting for owned events.', true, 20 FROM `capabilities` WHERE `code` = 'EVENT_HOST'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
CREATE TABLE `capabilityGrantFunctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grantId` int NOT NULL,
	`capabilityFunctionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityGrantFunctions_id` PRIMARY KEY(`id`),
	CONSTRAINT `cap_grant_function_unique` UNIQUE(`grantId`,`capabilityFunctionId`)
);
--> statement-breakpoint
CREATE TABLE `capabilityGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userAccountProfileId` int NOT NULL,
	`capabilityId` int NOT NULL,
	`applicationId` int,
	`status` enum('active','suspended','revoked','expired') NOT NULL DEFAULT 'active',
	`scopeType` enum('national','state','district','city','zone','ward') NOT NULL DEFAULT 'national',
	`scopeState` varchar(100),
	`scopeDistrict` varchar(100),
	`scopeCity` varchar(100),
	`scopeZone` varchar(100),
	`scopeWard` varchar(100),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`administrativeReason` text NOT NULL,
	`grantedByAdminId` int NOT NULL,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capabilityGrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `capabilityApplicationFunctions` ADD CONSTRAINT `cap_application_function_app_fk` FOREIGN KEY (`applicationId`) REFERENCES `capabilityApplications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityApplicationFunctions` ADD CONSTRAINT `cap_application_function_item_fk` FOREIGN KEY (`capabilityFunctionId`) REFERENCES `capabilityFunctions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityApplications` ADD CONSTRAINT `capability_application_profile_fk` FOREIGN KEY (`userAccountProfileId`) REFERENCES `userAccountProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityApplications` ADD CONSTRAINT `capability_application_catalog_fk` FOREIGN KEY (`capabilityId`) REFERENCES `capabilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityApplications` ADD CONSTRAINT `capability_application_admin_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityAuditRecords` ADD CONSTRAINT `capability_audit_application_fk` FOREIGN KEY (`applicationId`) REFERENCES `capabilityApplications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityAuditRecords` ADD CONSTRAINT `capability_audit_grant_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityAuditRecords` ADD CONSTRAINT `capability_audit_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityFunctions` ADD CONSTRAINT `capability_function_catalog_fk` FOREIGN KEY (`capabilityId`) REFERENCES `capabilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrantFunctions` ADD CONSTRAINT `cap_grant_function_grant_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrantFunctions` ADD CONSTRAINT `cap_grant_function_item_fk` FOREIGN KEY (`capabilityFunctionId`) REFERENCES `capabilityFunctions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrants` ADD CONSTRAINT `capability_grant_profile_fk` FOREIGN KEY (`userAccountProfileId`) REFERENCES `userAccountProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrants` ADD CONSTRAINT `capability_grant_catalog_fk` FOREIGN KEY (`capabilityId`) REFERENCES `capabilities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrants` ADD CONSTRAINT `capability_grant_application_fk` FOREIGN KEY (`applicationId`) REFERENCES `capabilityApplications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityGrants` ADD CONSTRAINT `capability_grant_admin_fk` FOREIGN KEY (`grantedByAdminId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `capabilities_active_sort_idx` ON `capabilities` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `capability_applications_user_idx` ON `capabilityApplications` (`userAccountProfileId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `capability_applications_status_idx` ON `capabilityApplications` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `capability_audit_application_idx` ON `capabilityAuditRecords` (`applicationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `capability_audit_grant_idx` ON `capabilityAuditRecords` (`grantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `capability_functions_capability_idx` ON `capabilityFunctions` (`capabilityId`,`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `capability_grants_profile_status_idx` ON `capabilityGrants` (`userAccountProfileId`,`status`,`endsAt`);--> statement-breakpoint
CREATE INDEX `capability_grants_capability_idx` ON `capabilityGrants` (`capabilityId`,`status`);
