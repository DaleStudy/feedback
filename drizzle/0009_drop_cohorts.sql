-- 기수 표와 surveys.cohort_id·audience 를 걷어낸다. D1 은 PRAGMA foreign_keys=OFF 를 무시하므로(AGENTS.md Gotchas) 자식 표를 새 표로 옮기고 자식부터 지운다.
CREATE TABLE `surveys_new` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`anonymous` integer DEFAULT true NOT NULL,
	`closes_at` text,
	`listed` integer DEFAULT true NOT NULL,
	`vars` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `surveys_new` (`id`, `title`, `description`, `anonymous`, `closes_at`, `listed`, `vars`, `created_at`) SELECT `id`, `title`, `description`, `anonymous`, `closes_at`, `listed`, `vars`, `created_at` FROM `surveys`;--> statement-breakpoint
CREATE TABLE `questions_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`survey_id` text NOT NULL,
	`position` integer NOT NULL,
	`key` text,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`config` text,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `questions_new` (`id`, `survey_id`, `position`, `key`, `type`, `label`, `required`, `config`) SELECT `id`, `survey_id`, `position`, `key`, `type`, `label`, `required`, `config` FROM `questions`;--> statement-breakpoint
CREATE TABLE `responses_new` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`respondent_key` text NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `responses_new` (`id`, `survey_id`, `respondent_key`, `submitted_at`) SELECT `id`, `survey_id`, `respondent_key`, `submitted_at` FROM `responses`;--> statement-breakpoint
CREATE TABLE `answers_new` (
	`response_id` text NOT NULL,
	`question_id` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`response_id`, `question_id`),
	FOREIGN KEY (`response_id`) REFERENCES `responses_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `answers_new` (`response_id`, `question_id`, `value`) SELECT `response_id`, `question_id`, `value` FROM `answers`;--> statement-breakpoint
CREATE TABLE `survey_editors_new` (
	`survey_id` text NOT NULL,
	`login` text NOT NULL,
	PRIMARY KEY(`survey_id`, `login`),
	FOREIGN KEY (`survey_id`) REFERENCES `surveys_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `survey_editors_new` (`survey_id`, `login`) SELECT `survey_id`, `login` FROM `survey_editors`;--> statement-breakpoint
-- 자식부터 지운다. 지울 때 남은 자식 행이 없으므로 CASCADE 가 옮긴 데이터를 건드리지 않는다.
DROP TABLE `answers`;--> statement-breakpoint
DROP TABLE `survey_editors`;--> statement-breakpoint
DROP TABLE `responses`;--> statement-breakpoint
DROP TABLE `questions`;--> statement-breakpoint
DROP TABLE `surveys`;--> statement-breakpoint
DROP TABLE `organizers`;--> statement-breakpoint
DROP TABLE `cohorts`;--> statement-breakpoint
DROP TABLE `programs`;--> statement-breakpoint
-- 이름을 바꾸면 다른 표의 외래 키도 새 이름을 따라간다 (surveys_new → surveys)
ALTER TABLE `surveys_new` RENAME TO `surveys`;--> statement-breakpoint
ALTER TABLE `questions_new` RENAME TO `questions`;--> statement-breakpoint
ALTER TABLE `responses_new` RENAME TO `responses`;--> statement-breakpoint
ALTER TABLE `answers_new` RENAME TO `answers`;--> statement-breakpoint
ALTER TABLE `survey_editors_new` RENAME TO `survey_editors`;--> statement-breakpoint
CREATE UNIQUE INDEX `responses_survey_respondent` ON `responses` (`survey_id`,`respondent_key`);
