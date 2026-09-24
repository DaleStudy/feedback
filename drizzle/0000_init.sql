CREATE TABLE `answers` (
	`response_id` text NOT NULL,
	`question_id` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`response_id`, `question_id`),
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` text PRIMARY KEY NOT NULL,
	`study_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leaders` (
	`study_id` text NOT NULL,
	`login` text NOT NULL,
	PRIMARY KEY(`study_id`, `login`),
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`cohort_id` text NOT NULL,
	`login` text NOT NULL,
	PRIMARY KEY(`cohort_id`, `login`),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`survey_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`options` text,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`respondent_key` text NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `responses_survey_respondent` ON `responses` (`survey_id`,`respondent_key`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `studies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`anonymous` integer DEFAULT true NOT NULL,
	`closes_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_unique` ON `users` (`login`);