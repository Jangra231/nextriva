ALTER TABLE `registrations` ADD `paymentProofUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `registrations` ADD `paymentProofSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `registrations` ADD `paymentRejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `registrations` ADD `paymentRejectionNote` text;