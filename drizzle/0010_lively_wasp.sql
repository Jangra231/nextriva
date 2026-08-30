ALTER TABLE `users` ADD `publicId` varchar(24);--> statement-breakpoint
UPDATE `users` SET `publicId` = CONCAT('USR-', UPPER(LEFT(REPLACE(UUID(), '-', ''), 16))) WHERE `publicId` IS NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY `publicId` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `organizerPublicId` varchar(24);--> statement-breakpoint
UPDATE `events` INNER JOIN `users` ON `events`.`organizerId` = `users`.`id` SET `events`.`organizerPublicId` = `users`.`publicId` WHERE `events`.`organizerPublicId` IS NULL;--> statement-breakpoint
ALTER TABLE `events` MODIFY `organizerPublicId` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `attendeePublicId` varchar(24);--> statement-breakpoint
UPDATE `registrations` INNER JOIN `users` ON `registrations`.`attendeeId` = `users`.`id` SET `registrations`.`attendeePublicId` = `users`.`publicId` WHERE `registrations`.`attendeePublicId` IS NULL;--> statement-breakpoint
ALTER TABLE `registrations` MODIFY `attendeePublicId` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `registrationNumber` varchar(24);--> statement-breakpoint
UPDATE `registrations` SET `registrationNumber` = CONCAT('REG-', UPPER(LEFT(REPLACE(UUID(), '-', ''), 16))) WHERE `registrationNumber` IS NULL;--> statement-breakpoint
ALTER TABLE `registrations` MODIFY `registrationNumber` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_registrationNumber_unique` UNIQUE(`registrationNumber`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_publicId_unique` UNIQUE(`publicId`);--> statement-breakpoint
CREATE INDEX `registrations_attendee_public_idx` ON `registrations` (`attendeePublicId`);
