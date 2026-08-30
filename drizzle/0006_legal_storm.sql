DROP INDEX `follows_event_attendee_idx` ON `eventFollows`;--> statement-breakpoint
ALTER TABLE `registrations` ADD `paymentStatus` enum('not_required','pending','paid','failed','refunded') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `stripePaymentIntentId` varchar(255);--> statement-breakpoint
ALTER TABLE `registrations` ADD `stripeCheckoutSessionId` varchar(255);--> statement-breakpoint
ALTER TABLE `registrations` ADD `confirmationEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `registrations` ADD `reminderEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `eventFollows` ADD CONSTRAINT `follows_event_attendee_unique_idx` UNIQUE(`eventId`,`attendeeId`);--> statement-breakpoint
CREATE INDEX `registrations_checkout_session_idx` ON `registrations` (`stripeCheckoutSessionId`);