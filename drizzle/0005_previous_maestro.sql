ALTER TABLE `tickets` ADD `gstApplicable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `gstRatePercent` int DEFAULT 0 NOT NULL;