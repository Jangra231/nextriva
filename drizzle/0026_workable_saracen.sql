CREATE TABLE IF NOT EXISTS `userAccountProfiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `accountType` enum('USER','PLATFORM_ADMIN') NOT NULL DEFAULT 'USER',
  `profileTerminology` varchar(80) NOT NULL DEFAULT 'User Profile',
  `legacyRole` varchar(64),
  `migrationSource` varchar(80) NOT NULL DEFAULT 'stage2_backfill',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `userAccountProfiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `userAccountProfiles_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `userAccountProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade,
  KEY `user_account_profiles_type_idx` (`accountType`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `legacyAccountCapabilityMappings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userAccountProfileId` int NOT NULL,
  `legacyRole` varchar(64) NOT NULL,
  `capabilityCode` varchar(64) NOT NULL,
  `active` boolean NOT NULL DEFAULT true,
  `mappingSource` varchar(80) NOT NULL DEFAULT 'stage2_backfill',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `legacyAccountCapabilityMappings_id` PRIMARY KEY(`id`),
  CONSTRAINT `legacy_account_capability_unique` UNIQUE(`userAccountProfileId`,`capabilityCode`),
  CONSTRAINT `legacy_account_capability_profile_fk` FOREIGN KEY (`userAccountProfileId`) REFERENCES `userAccountProfiles`(`id`) ON DELETE cascade,
  KEY `legacy_account_capability_code_idx` (`capabilityCode`,`active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `accountMigrationRecords` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `migrationCode` varchar(96) NOT NULL,
  `beforeState` json,
  `afterState` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `accountMigrationRecords_id` PRIMARY KEY(`id`),
  CONSTRAINT `account_migration_record_unique` UNIQUE(`userId`,`migrationCode`),
  CONSTRAINT `account_migration_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade,
  KEY `account_migration_record_code_idx` (`migrationCode`,`createdAt`)
);
--> statement-breakpoint
INSERT INTO `userAccountProfiles` (`userId`, `accountType`, `profileTerminology`, `legacyRole`, `migrationSource`)
SELECT
  `id`,
  CASE WHEN `role` = 'admin' THEN 'PLATFORM_ADMIN' ELSE 'USER' END,
  CASE WHEN `role` = 'admin' THEN 'Platform Admin Profile' ELSE 'User Profile' END,
  `role`,
  'stage2_backfill'
FROM `users`
ON DUPLICATE KEY UPDATE
  `legacyRole` = VALUES(`legacyRole`),
  `accountType` = VALUES(`accountType`),
  `profileTerminology` = VALUES(`profileTerminology`);
--> statement-breakpoint
INSERT INTO `legacyAccountCapabilityMappings` (`userAccountProfileId`, `legacyRole`, `capabilityCode`, `active`, `mappingSource`)
SELECT `profile`.`id`, `user`.`role`, CASE WHEN `user`.`role` = 'mcd' THEN 'LOCAL_AUTHORITY' ELSE 'CSR' END, true, 'stage2_backfill'
FROM `users` AS `user`
INNER JOIN `userAccountProfiles` AS `profile` ON `profile`.`userId` = `user`.`id`
WHERE `user`.`role` IN ('mcd', 'csr')
ON DUPLICATE KEY UPDATE
  `legacyRole` = VALUES(`legacyRole`),
  `active` = VALUES(`active`);
--> statement-breakpoint
INSERT INTO `accountMigrationRecords` (`userId`, `migrationCode`, `beforeState`, `afterState`)
SELECT
  `id`,
  'stage2_account_profile_backfill',
  JSON_OBJECT('legacyRole', `role`, 'publicId', `publicId`),
  JSON_OBJECT('accountType', CASE WHEN `role` = 'admin' THEN 'PLATFORM_ADMIN' ELSE 'USER' END, 'profileTerminology', CASE WHEN `role` = 'admin' THEN 'Platform Admin Profile' ELSE 'User Profile' END)
FROM `users`
ON DUPLICATE KEY UPDATE `migrationCode` = VALUES(`migrationCode`);
