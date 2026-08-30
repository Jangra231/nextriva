ALTER TABLE `csrSponsorships` MODIFY COLUMN `status` enum('draft','submitted','mcd_approved','mcd_rejected','approved','rejected','cancelled') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD `mcdReviewNote` text;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD `mcdReviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD `mcdReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_mcdReviewedByUserId_users_id_fk` FOREIGN KEY (`mcdReviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;