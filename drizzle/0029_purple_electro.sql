ALTER TABLE `capabilityFunctions` ADD `isMandatory` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `capabilityFunctions` ADD `dependencyCodes` json;--> statement-breakpoint
ALTER TABLE `capabilityFunctions` ADD `handlesSensitiveData` boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO `capabilities` (`code`, `displayName`, `description`, `audience`, `active`, `sortOrder`) VALUES
  ('DISTRICT_LEVEL', 'District delivery coordination', 'District-level activity coordination, local reporting, and accountable delivery oversight within a defined territory.', 'District programme and delivery teams', true, 50),
  ('STATE_LEVEL', 'State programme stewardship', 'State-level programme oversight, aggregate reporting, and accountable inter-district coordination within an approved scope.', 'State programme and public-health teams', true, 60)
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `audience` = VALUES(`audience`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'DISTRICT_ACTIVITY_MONITOR', 'Monitor district activity', 'Review district-level activity, location readiness, participation signals, and delivery exceptions within the approved district scope.', true, JSON_ARRAY(), false, true, 10 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL'
ON DUPLICATE KEY UPDATE `capabilityId` = VALUES(`capabilityId`), `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `isMandatory` = VALUES(`isMandatory`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'DISTRICT_LOCAL_REPORTING', 'Export district delivery report', 'Download the approved district-level delivery report for the selected scope.', false, JSON_ARRAY('DISTRICT_ACTIVITY_MONITOR'), true, true, 20 FROM `capabilities` WHERE `code` = 'DISTRICT_LEVEL'
ON DUPLICATE KEY UPDATE `capabilityId` = VALUES(`capabilityId`), `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `isMandatory` = VALUES(`isMandatory`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'STATE_PROGRAM_OVERSIGHT', 'Oversee state programme', 'Review aggregate state programme activity and accountable inter-district delivery outcomes within the approved state scope.', true, JSON_ARRAY(), true, true, 10 FROM `capabilities` WHERE `code` = 'STATE_LEVEL'
ON DUPLICATE KEY UPDATE `capabilityId` = VALUES(`capabilityId`), `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `isMandatory` = VALUES(`isMandatory`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
INSERT INTO `capabilityFunctions` (`capabilityId`, `code`, `displayName`, `description`, `isMandatory`, `dependencyCodes`, `handlesSensitiveData`, `active`, `sortOrder`) SELECT `id`, 'STATE_AGGREGATE_REPORTING', 'Export state programme report', 'Download authorised aggregate programme reporting for the approved state scope.', false, JSON_ARRAY('STATE_PROGRAM_OVERSIGHT'), true, true, 20 FROM `capabilities` WHERE `code` = 'STATE_LEVEL'
ON DUPLICATE KEY UPDATE `capabilityId` = VALUES(`capabilityId`), `displayName` = VALUES(`displayName`), `description` = VALUES(`description`), `isMandatory` = VALUES(`isMandatory`), `dependencyCodes` = VALUES(`dependencyCodes`), `handlesSensitiveData` = VALUES(`handlesSensitiveData`), `active` = VALUES(`active`), `sortOrder` = VALUES(`sortOrder`);--> statement-breakpoint
UPDATE `capabilityFunctions`
SET `isMandatory` = CASE `code`
  WHEN 'LA_EVENT_REVIEW' THEN true
  WHEN 'LA_TERRITORY_MONITOR' THEN true
  WHEN 'CSR_BRIEF_SUBMIT' THEN true
  WHEN 'VENUE_AVAILABILITY_MONITOR' THEN true
  WHEN 'EVENT_LIFECYCLE_MANAGE' THEN true
  ELSE false
END,
`dependencyCodes` = CASE `code`
  WHEN 'LA_MIS_EXPORT' THEN JSON_ARRAY('LA_TERRITORY_MONITOR')
  WHEN 'CSR_IMPACT_VIEW' THEN JSON_ARRAY('CSR_BRIEF_SUBMIT')
  WHEN 'EVENT_PARTICIPATION_REPORT' THEN JSON_ARRAY('EVENT_LIFECYCLE_MANAGE')
  ELSE JSON_ARRAY()
END,
`handlesSensitiveData` = CASE `code`
  WHEN 'LA_EVENT_REVIEW' THEN true
  WHEN 'LA_TERRITORY_MONITOR' THEN true
  WHEN 'LA_MIS_EXPORT' THEN true
  WHEN 'CSR_IMPACT_VIEW' THEN true
  WHEN 'EVENT_PARTICIPATION_REPORT' THEN true
  ELSE false
END
WHERE `code` IN ('LA_EVENT_REVIEW', 'LA_TERRITORY_MONITOR', 'LA_MIS_EXPORT', 'CSR_BRIEF_SUBMIT', 'CSR_IMPACT_VIEW', 'VENUE_AVAILABILITY_MONITOR', 'EVENT_LIFECYCLE_MANAGE', 'EVENT_PARTICIPATION_REPORT');
