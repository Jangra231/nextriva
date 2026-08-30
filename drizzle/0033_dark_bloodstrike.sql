CREATE TABLE `authorityDeliveryPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`grantId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`objective` text NOT NULL,
	`scopeType` enum('national','state','district','city','zone','ward') NOT NULL,
	`state` varchar(100),
	`district` varchar(100),
	`city` varchar(100),
	`zone` varchar(100),
	`ward` varchar(100),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorityDeliveryPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorityDeliveryPlans_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `authorityExceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`grantId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`capabilityCode` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`details` text NOT NULL,
	`scopeType` enum('national','state','district','city','zone','ward') NOT NULL,
	`state` varchar(100),
	`district` varchar(100),
	`city` varchar(100),
	`zone` varchar(100),
	`ward` varchar(100),
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`resolutionNote` text,
	`resolvedByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorityExceptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorityExceptions_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `authorityStateProgrammes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`grantId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`objective` text NOT NULL,
	`scopeType` enum('national','state','district','city','zone','ward') NOT NULL,
	`state` varchar(100),
	`district` varchar(100),
	`city` varchar(100),
	`zone` varchar(100),
	`ward` varchar(100),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorityStateProgrammes_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorityStateProgrammes_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
ALTER TABLE `authorityDeliveryPlans` ADD CONSTRAINT `authorityDeliveryPlans_grantId_capabilityGrants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityDeliveryPlans` ADD CONSTRAINT `authorityDeliveryPlans_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityExceptions` ADD CONSTRAINT `authorityExceptions_grantId_capabilityGrants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityExceptions` ADD CONSTRAINT `authorityExceptions_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityExceptions` ADD CONSTRAINT `authorityExceptions_resolvedByUserId_users_id_fk` FOREIGN KEY (`resolvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityStateProgrammes` ADD CONSTRAINT `authorityStateProgrammes_grantId_capabilityGrants_id_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authorityStateProgrammes` ADD CONSTRAINT `authorityStateProgrammes_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `authority_plan_grant_idx` ON `authorityDeliveryPlans` (`grantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `authority_plan_scope_idx` ON `authorityDeliveryPlans` (`scopeType`,`state`,`district`,`city`);--> statement-breakpoint
CREATE INDEX `authority_exception_grant_idx` ON `authorityExceptions` (`grantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `authority_exception_scope_idx` ON `authorityExceptions` (`capabilityCode`,`scopeType`,`state`,`district`);--> statement-breakpoint
CREATE INDEX `authority_programme_grant_idx` ON `authorityStateProgrammes` (`grantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `authority_programme_scope_idx` ON `authorityStateProgrammes` (`scopeType`,`state`,`district`,`city`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'LA_LOCATION_MONITOR', 'Monitor approved locations', 'View only the active approved locations and location/date conflict signals within the grant territory. This function cannot change the master venue registry.', false, JSON_ARRAY('LA_TERRITORY_MONITOR'), false, true, 40 FROM `capabilities` WHERE `code` = 'LOCAL_AUTHORITY' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'DISTRICT_PLAN_CREATE', 'Create district delivery plan', 'Create a scoped district delivery plan that inherits the active grant territory and records capability audit evidence.', true, JSON_ARRAY(), false, true, 10 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'DISTRICT_EVENT_REVIEW', 'Review district event', 'Approve, return, freeze, or suspend an event only when it falls within the selected district grant territory.', true, JSON_ARRAY(), false, true, 20 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'DISTRICT_DELIVERY_MONITOR', 'Monitor district delivery', 'View aggregate in-scope events, registrations, attendance, and approved locations.', true, JSON_ARRAY('DISTRICT_PLAN_CREATE'), false, true, 30 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'DISTRICT_MIS_EXPORT', 'Export district MIS', 'Download a masked aggregate district report restricted to the active grant territory.', false, JSON_ARRAY('DISTRICT_DELIVERY_MONITOR'), false, true, 40 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'DISTRICT_EXCEPTION_MANAGE', 'Manage district exception', 'Create or resolve a scope-bound district delivery exception with capability audit evidence.', false, JSON_ARRAY('DISTRICT_DELIVERY_MONITOR'), false, true, 50 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_PROGRAMME_CREATE', 'Create state programme', 'Create a state-scoped programme or campaign that inherits the active grant territory.', true, JSON_ARRAY(), false, true, 10 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_DISTRICT_PERFORMANCE_VIEW', 'Review district performance', 'View aggregate district delivery performance within the active state or national grant territory.', true, JSON_ARRAY('STATE_PROGRAMME_CREATE'), false, true, 20 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_COVERAGE_VIEW', 'View state coverage', 'View aggregate in-scope event, attendance, and approved-location coverage.', true, JSON_ARRAY('STATE_PROGRAMME_CREATE'), false, true, 30 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_MIS_EXPORT', 'Consolidate state MIS', 'Download a masked aggregate state report restricted to the active grant territory.', false, JSON_ARRAY('STATE_COVERAGE_VIEW'), false, true, 40 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_ESCALATION_MANAGE', 'Manage state escalation', 'Create or resolve a scope-bound state escalation with capability audit evidence.', false, JSON_ARRAY('STATE_COVERAGE_VIEW'), false, true, 50 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`,`code`,`displayName`,`description`,`isMandatory`,`dependencyCodes`,`handlesSensitiveData`,`active`,`sortOrder`) SELECT `id`, 'STATE_CSR_IMPACT_VIEW', 'Review CSR aggregate impact', 'View only aggregate capability-linked CSR assignment and funding figures within the active grant territory.', false, JSON_ARRAY('STATE_COVERAGE_VIEW'), false, true, 60 FROM `capabilities` WHERE `code` = 'STATE_LEVEL' ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `dependencyCodes` = VALUES(`dependencyCodes`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);
