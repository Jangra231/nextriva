ALTER TABLE `events` ADD `locationMode` enum('address','undecided') DEFAULT 'address' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `bibExpoDate` timestamp;--> statement-breakpoint
ALTER TABLE `events` ADD `addressLine1` varchar(220);--> statement-breakpoint
ALTER TABLE `events` ADD `addressLine2` varchar(220);--> statement-breakpoint
ALTER TABLE `tickets` ADD `ticketCategory` enum('paid','free','donation') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `minPerBooking` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `maxPerBooking` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `platformFeePayer` enum('organizer','buyer') DEFAULT 'organizer' NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `fitizenFeePayer` enum('organizer','buyer') DEFAULT 'organizer' NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `gatewayFeePayer` enum('organizer','buyer') DEFAULT 'organizer' NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `attendeeMessage` text;