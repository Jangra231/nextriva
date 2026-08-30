CREATE TABLE IF NOT EXISTS `authorityTerminologyMappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyCode` varchar(64) NOT NULL,
	`capabilityCode` varchar(64) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `authorityTerminologyMappings_id` PRIMARY KEY(`id`),
  CONSTRAINT `authorityTerminologyMappings_legacyCode_unique` UNIQUE(`legacyCode`),
  KEY `authority_terminology_capability_idx` (`capabilityCode`,`active`)
);
--> statement-breakpoint
INSERT INTO `authorityTerminologyMappings` (`legacyCode`, `capabilityCode`, `displayName`, `active`)
VALUES
  ('mcd', 'LOCAL_AUTHORITY', 'Local Authority', true),
  ('bmc', 'LOCAL_AUTHORITY', 'Local Authority', true),
  ('mcd/bmc', 'LOCAL_AUTHORITY', 'Local Authority', true)
ON DUPLICATE KEY UPDATE
  `capabilityCode` = VALUES(`capabilityCode`),
  `displayName` = VALUES(`displayName`),
  `active` = VALUES(`active`);
