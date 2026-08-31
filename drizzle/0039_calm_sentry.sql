CREATE TABLE `otpVerifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`purpose` enum('signup','login','password_reset') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otpVerifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passwordResets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `gender` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `dateOfBirth` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `interests` json;--> statement-breakpoint
ALTER TABLE `users` ADD `eventFormat` json;--> statement-breakpoint
ALTER TABLE `users` ADD `eventFrequency` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `notificationPrefs` json;--> statement-breakpoint
ALTER TABLE `users` ADD `profileCompleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_phone_unique` UNIQUE(`phone`);--> statement-breakpoint
CREATE INDEX `otp_phone_purpose_idx` ON `otpVerifications` (`phone`,`purpose`);--> statement-breakpoint
CREATE INDEX `pwd_reset_user_idx` ON `passwordResets` (`userId`);