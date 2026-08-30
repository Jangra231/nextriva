CREATE TABLE `csrBudgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`csrProfileId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`totalPaise` int NOT NULL,
	`committedPaise` int NOT NULL DEFAULT 0,
	`spentPaise` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrBudgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csrProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(180) NOT NULL,
	`registrationNumber` varchar(120),
	`foundationName` varchar(180),
	`contactName` varchar(140) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(40),
	`focusAreas` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `csrProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `csrSponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`csrProfileId` int NOT NULL,
	`budgetId` int NOT NULL,
	`eventId` int NOT NULL,
	`activityCategoryId` int NOT NULL,
	`approvedVenueId` int NOT NULL,
	`implementationAgencyId` int NOT NULL,
	`city` varchar(100) NOT NULL,
	`zone` varchar(100) NOT NULL,
	`ward` varchar(100) NOT NULL,
	`amountPaise` int NOT NULL,
	`purpose` text,
	`status` enum('draft','submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`csrApprovalNote` text,
	`adminApprovalNote` text,
	`submittedAt` timestamp,
	`reviewedByAdminId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csrSponsorships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `implementationAgencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`registrationNumber` varchar(120),
	`contactName` varchar(140),
	`contactEmail` varchar(320),
	`contactPhone` varchar(40),
	`coverageNotes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `implementationAgencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `implementationAgencies_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','mcd','csr') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `csrBudgets` ADD CONSTRAINT `csrBudgets_csrProfileId_csrProfiles_id_fk` FOREIGN KEY (`csrProfileId`) REFERENCES `csrProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrProfiles` ADD CONSTRAINT `csrProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_csrProfileId_csrProfiles_id_fk` FOREIGN KEY (`csrProfileId`) REFERENCES `csrProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_budgetId_csrBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `csrBudgets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_activityCategoryId_categories_id_fk` FOREIGN KEY (`activityCategoryId`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_approvedVenueId_approvedVenues_id_fk` FOREIGN KEY (`approvedVenueId`) REFERENCES `approvedVenues`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csr_spons_agency_fk` FOREIGN KEY (`implementationAgencyId`) REFERENCES `implementationAgencies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `csrSponsorships` ADD CONSTRAINT `csrSponsorships_reviewedByAdminId_users_id_fk` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `implementationAgencies` ADD CONSTRAINT `implementationAgencies_createdByAdminId_users_id_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `csr_budgets_profile_active_idx` ON `csrBudgets` (`csrProfileId`,`active`);--> statement-breakpoint
CREATE INDEX `csr_profiles_active_idx` ON `csrProfiles` (`active`);--> statement-breakpoint
CREATE INDEX `csr_sponsorship_profile_idx` ON `csrSponsorships` (`csrProfileId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `csr_sponsorship_event_idx` ON `csrSponsorships` (`eventId`);--> statement-breakpoint
CREATE INDEX `csr_sponsorship_status_idx` ON `csrSponsorships` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `implementation_agencies_active_idx` ON `implementationAgencies` (`active`);
