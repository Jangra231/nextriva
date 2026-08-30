ALTER TABLE `userAccountProfiles` DROP FOREIGN KEY `userAccountProfiles_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `userAccountProfiles` ADD CONSTRAINT `user_account_profile_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
