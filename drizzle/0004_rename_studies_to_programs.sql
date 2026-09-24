-- drizzle-kit 이 만든 테이블 재생성 SQL 대신 SQLite 네이티브 rename 을 쓴다.
-- RENAME TO 는 다른 테이블의 FK 참조를 함께 고치고, RENAME COLUMN 은 같은 테이블의 PK/FK 정의를 함께 고친다.
-- D1 은 마이그레이션을 트랜잭션으로 묶어 PRAGMA foreign_keys=OFF 가 듣지 않으므로 DROP/재생성 방식은 위험하다.
ALTER TABLE `studies` RENAME TO `programs`;--> statement-breakpoint
ALTER TABLE `cohorts` RENAME COLUMN `study_id` TO `program_id`;--> statement-breakpoint
ALTER TABLE `leaders` RENAME COLUMN `study_id` TO `program_id`;
