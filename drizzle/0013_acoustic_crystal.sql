CREATE TABLE `adminAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(48) NOT NULL,
	`entityId` int NOT NULL,
	`beforeState` json,
	`afterState` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `adminAuditLogs` ADD CONSTRAINT `adminAuditLogs_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_audit_admin_idx` ON `adminAuditLogs` (`adminId`);--> statement-breakpoint
CREATE INDEX `admin_audit_entity_idx` ON `adminAuditLogs` (`entityType`,`entityId`);