CREATE TABLE `capabilityDecisionNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`applicationId` int,
	`grantId` int,
	`kind` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`actionUrl` varchar(260) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capabilityDecisionNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `capabilityDecisionNotifications` ADD CONSTRAINT `capability_decision_notification_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityDecisionNotifications` ADD CONSTRAINT `capability_decision_notification_application_fk` FOREIGN KEY (`applicationId`) REFERENCES `capabilityApplications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `capabilityDecisionNotifications` ADD CONSTRAINT `capability_decision_notification_grant_fk` FOREIGN KEY (`grantId`) REFERENCES `capabilityGrants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `capability_decision_notification_user_idx` ON `capabilityDecisionNotifications` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `capability_decision_notification_application_idx` ON `capabilityDecisionNotifications` (`applicationId`,`createdAt`);