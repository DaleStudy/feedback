import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(), // GitHub user id
  login: text('login').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
})

export const studies = sqliteTable('studies', {
  id: text('id').primaryKey(), // 'blog', 'leetcode'
  name: text('name').notNull(),
})

export const cohorts = sqliteTable('cohorts', {
  id: text('id').primaryKey(), // 'blog01' — GitHub 팀 슬러그(leetcode08)와 같은 표기
  studyId: text('study_id')
    .notNull()
    .references(() => studies.id),
  name: text('name').notNull(), // '2기'
})

// 리더는 스터디 단위. GitHub login 으로 등록하므로 로그인 전에도 명단을 넣을 수 있다.
export const leaders = sqliteTable(
  'leaders',
  {
    studyId: text('study_id')
      .notNull()
      .references(() => studies.id),
    login: text('login').notNull(),
  },
  (t) => [primaryKey({ columns: [t.studyId, t.login] })],
)

export const surveys = sqliteTable('surveys', {
  id: text('id').primaryKey(), // 'blog01-final'
  cohortId: text('cohort_id')
    .notNull()
    .references(() => cohorts.id),
  title: text('title').notNull(),
  description: text('description'),
  anonymous: integer('anonymous', { mode: 'boolean' }).notNull().default(true),
  closesAt: text('closes_at'), // null 이면 계속 열려 있음
  createdAt: text('created_at').notNull(),
})

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type QuestionConfig = { [key: string]: JsonValue }

// 유형을 추가하려면 여기에 이름을 넣고 src/questions/types/ 에 정의 파일을 만들어 registry 에 등록한다.
export const questionTypes = ['scale', 'short', 'long', 'choice'] as const
export type QuestionType = (typeof questionTypes)[number]

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  surveyId: text('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  // 스터디·기수를 가로질러 같은 문항을 찾는 키. 공통 문항(src/questions/common.ts)만 값이 있다.
  key: text('key'),
  type: text('type', { enum: questionTypes }).notNull(),
  label: text('label').notNull(),
  required: integer('required', { mode: 'boolean' }).notNull().default(true),
  // 유형별 설정. 모양은 각 유형 정의의 defaultConfig 가 정한다 (scale: min/max/라벨, choice: options).
  // unknown 대신 JsonValue 로 두는 이유: 서버 함수 반환 타입이 직렬화 가능해야 라우트의 loader 타입이 추론된다.
  config: text('config', { mode: 'json' }).$type<QuestionConfig>(),
})

export const responses = sqliteTable(
  'responses',
  {
    id: text('id').primaryKey(),
    surveyId: text('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    // 익명 설문이면 HMAC(surveyId:userId), 실명 설문이면 login.
    // 같은 사람이 같은 설문에 두 번 응답하는 것만 막고, 익명이면 누가 썼는지는 복원 불가.
    respondentKey: text('respondent_key').notNull(),
    submittedAt: text('submitted_at').notNull(),
  },
  (t) => [uniqueIndex('responses_survey_respondent').on(t.surveyId, t.respondentKey)],
)

export const answers = sqliteTable(
  'answers',
  {
    responseId: text('response_id')
      .notNull()
      .references(() => responses.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.responseId, t.questionId] })],
)
