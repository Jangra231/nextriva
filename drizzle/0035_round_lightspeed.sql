CREATE TABLE `capabilityApplicationDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityApplicationDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `capabilityApplications` ADD `roleSpecificData` json;--> statement-breakpoint
ALTER TABLE `capabilityApplicationDocuments` ADD CONSTRAINT `cap_app_document_application_fk` FOREIGN KEY (`applicationId`) REFERENCES `capabilityApplications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityApplicationDocuments` ADD CONSTRAINT `cap_app_document_user_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cap_app_document_application_idx` ON `capabilityApplicationDocuments` (`applicationId`,`createdAt`);