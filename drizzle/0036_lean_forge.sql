CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(32) NOT NULL,
	`gatewayFeePercent` int NOT NULL DEFAULT 0,
	`invoicePrefix` varchar(12) NOT NULL DEFAULT 'NXR',
	`issuerLegalName` varchar(180),
	`issuerTaxRegistrationNumber` varchar(80),
	`issuerAddress` text,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformSettings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `taxInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` int NOT NULL,
	`invoiceNumber` varchar(40) NOT NULL,
	`invoicePrefix` varchar(12) NOT NULL,
	`issuerLegalName` varchar(180),
	`issuerTaxRegistrationNumber` varchar(80),
	`issuerAddress` text,
	`ticketSubtotalPaise` int NOT NULL DEFAULT 0,
	`gstPaise` int NOT NULL DEFAULT 0,
	`platformFeePaise` int NOT NULL DEFAULT 0,
	`gatewayFeePaise` int NOT NULL DEFAULT 0,
	`totalPaise` int NOT NULL DEFAULT 0,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `taxInvoices_registrationId_unique` UNIQUE(`registrationId`),
	CONSTRAINT `taxInvoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `gatewayFeePaise` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `gatewayFeePercent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `platformSettings` ADD CONSTRAINT `platformSettings_updatedByAdminId_users_id_fk` FOREIGN KEY (`updatedByAdminId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxInvoices` ADD CONSTRAINT `taxInvoices_registrationId_registrations_id_fk` FOREIGN KEY (`registrationId`) REFERENCES `registrations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `platform_settings_updated_idx` ON `platformSettings` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `tax_invoices_issued_idx` ON `taxInvoices` (`issuedAt`);