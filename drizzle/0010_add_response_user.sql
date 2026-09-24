-- 익명 응답(respondent_key = HMAC)을 없애고 응답자를 users.id 로 저장한다.
-- NOT NULL 컬럼은 기본값 없이 추가할 수 없어 두 테이블을 다시 만든다. 적용 시점에 프로덕션 응답은 0건이었다.
DROP TABLE `answers`;--> statement-breakpoint
DROP TABLE `responses`;--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`submitted_at` text NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `responses_survey_user` ON `responses` (`survey_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `answers` (
	`response_id` text NOT NULL,
	`question_id` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`response_id`, `question_id`),
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
