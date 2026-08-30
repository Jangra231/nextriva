ALTER TABLE `events` ADD `moderationStatus` enum('draft','submitted','approved','rejected','frozen','suspended','deleted') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `submittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `reviewedByAdminId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `moderationNote` text;--> statement-breakpoint
ALTER TABLE `events` ADD `platformFeePercent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `platformFeePaise` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `events_organizer_moderation_idx` ON `events` (`organizerId`,`moderationStatus`);--> statement-breakpoint
CREATE INDEX `events_moderation_idx` ON `events` (`moderationStatus`,`updatedAt`);