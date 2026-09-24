-- 운영진을 프로그램 단위(leaders)에서 기수 단위(organizers)로. 기존 리더는 그 프로그램의 모든 기수 운영진으로 옮긴다.
-- drizzle-kit 의 rename 대신 직접 쓴다: 컬럼 의미(program_id → cohort_id)가 달라 단순 rename 으로는 데이터를 옮길 수 없다.
CREATE TABLE `organizers` (
	`cohort_id` text NOT NULL,
	`login` text NOT NULL,
	PRIMARY KEY(`cohort_id`, `login`),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `organizers` (`cohort_id`, `login`) SELECT c.`id`, l.`login` FROM `leaders` l JOIN `cohorts` c ON c.`program_id` = l.`program_id`;--> statement-breakpoint
DROP TABLE `leaders`;--> statement-breakpoint
UPDATE `surveys` SET `audience` = 'organizers' WHERE `audience` = 'leaders';--> statement-breakpoint
UPDATE `questions` SET `key` = 'organizer_' || substr(`key`, 6) WHERE `key` LIKE 'lead\_%' ESCAPE '\';
