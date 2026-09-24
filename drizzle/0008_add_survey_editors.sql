CREATE TABLE `survey_editors` (
	`survey_id` text NOT NULL,
	`login` text NOT NULL,
	PRIMARY KEY(`survey_id`, `login`),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `surveys` ADD `listed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `can_create_surveys` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- 기존 설문: 그 기수의 운영진을 편집자로 옮긴다
INSERT OR IGNORE INTO `survey_editors` (`survey_id`, `login`) SELECT `surveys`.`id`, `organizers`.`login` FROM `surveys` JOIN `organizers` ON `organizers`.`cohort_id` = `surveys`.`cohort_id`;--> statement-breakpoint
-- 운영진 설문은 홈에 띄우지 않고 링크로만
UPDATE `surveys` SET `listed` = false WHERE `audience` = 'organizers';
