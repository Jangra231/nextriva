ALTER TABLE `events` ADD `manualPaymentEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `manualPaymentMethod` enum('upi','bank','both');--> statement-breakpoint
ALTER TABLE `events` ADD `upiId` varchar(128);--> statement-breakpoint
ALTER TABLE `events` ADD `bankAccountName` varchar(160);--> statement-breakpoint
ALTER TABLE `events` ADD `bankAccountNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `events` ADD `bankIfsc` varchar(32);--> statement-breakpoint
ALTER TABLE `events` ADD `bankName` varchar(160);--> statement-breakpoint
ALTER TABLE `events` ADD `manualPaymentNote` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `manualPaymentReference` varchar(128);