ALTER TABLE `registrations` MODIFY COLUMN `registrationNumber` varchar(24);--> statement-breakpoint
ALTER TABLE `events` ADD `publicId` varchar(24);--> statement-breakpoint
UPDATE `events` SET `publicId` = CONCAT('EVT-', `id`) WHERE `publicId` IS NULL OR `publicId` = '';--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `publicId` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_publicId_unique` UNIQUE(`publicId`);
