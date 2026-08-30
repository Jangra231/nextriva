CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(90) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `customQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`question` varchar(240) NOT NULL,
	`fieldType` enum('short_text','long_text','select','checkbox') NOT NULL DEFAULT 'short_text',
	`options` json,
	`required` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventFollows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`attendeeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventFollows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`categoryId` int,
	`title` varchar(150) NOT NULL,
	`displayName` varchar(50) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`visibility` enum('public','private','external') NOT NULL DEFAULT 'public',
	`status` enum('draft','live','completed') NOT NULL DEFAULT 'draft',
	`currentStep` int NOT NULL DEFAULT 1,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Calcutta',
	`city` varchar(100),
	`venueName` varchar(160),
	`address` text,
	`description` text,
	`coverUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`title` varchar(140) NOT NULL,
	`channel` enum('social','email','partner','featured') NOT NULL DEFAULT 'social',
	`status` enum('draft','scheduled','active','completed') NOT NULL DEFAULT 'draft',
	`budgetPaise` int NOT NULL DEFAULT 0,
	`scheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`ticketId` int,
	`attendeeId` int NOT NULL,
	`orderNumber` varchar(40) NOT NULL,
	`status` enum('confirmed','cancelled','checked_in') NOT NULL DEFAULT 'confirmed',
	`paidAmountPaise` int NOT NULL DEFAULT 0,
	`answers` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`pricePaise` int NOT NULL DEFAULT 0,
	`quantityLimit` int NOT NULL DEFAULT 100,
	`quantitySold` int NOT NULL DEFAULT 0,
	`salesStartAt` timestamp,
	`salesEndAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customQuestions` ADD CONSTRAINT `customQuestions_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventFollows` ADD CONSTRAINT `eventFollows_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventFollows` ADD CONSTRAINT `eventFollows_attendeeId_users_id_fk` FOREIGN KEY (`attendeeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_attendeeId_users_id_fk` FOREIGN KEY (`attendeeId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `questions_event_idx` ON `customQuestions` (`eventId`);--> statement-breakpoint
CREATE INDEX `follows_event_attendee_idx` ON `eventFollows` (`eventId`,`attendeeId`);--> statement-breakpoint
CREATE INDEX `events_organizer_status_idx` ON `events` (`organizerId`,`status`);--> statement-breakpoint
CREATE INDEX `events_public_listing_idx` ON `events` (`status`,`visibility`,`startsAt`);--> statement-breakpoint
CREATE INDEX `events_city_idx` ON `events` (`city`);--> statement-breakpoint
CREATE INDEX `promotions_event_idx` ON `promotions` (`eventId`);--> statement-breakpoint
CREATE INDEX `registrations_event_idx` ON `registrations` (`eventId`);--> statement-breakpoint
CREATE INDEX `registrations_attendee_idx` ON `registrations` (`attendeeId`);--> statement-breakpoint
CREATE INDEX `tickets_event_idx` ON `tickets` (`eventId`);