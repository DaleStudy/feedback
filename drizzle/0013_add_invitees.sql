CREATE TABLE `survey_invitees` (
	`survey_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`survey_id`, `kind`, `name`),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `surveys` ADD `visibility` text DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `teams` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- 링크로만 공개하던 설문(listed = 0)은 link 로 옮긴다. listed 는 0014 에서 지운다.
UPDATE `surveys` SET `visibility` = 'link' WHERE `listed` = 0;
