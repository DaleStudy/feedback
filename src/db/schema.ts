import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type { CommonVars } from '@/questions/common'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(), // GitHub user id
  login: text('login').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  // 로그인할 때 GitHub 의 DaleStudy maintainer 팀 멤버인지 확인해 적는다. 새 설문은 이 사람만 만든다.
  canCreateSurveys: integer('can_create_surveys', { mode: 'boolean' }).notNull().default(false),
  // 로그인할 때 받아 두는 DaleStudy 조직의 팀 slug 목록. 팀으로 대상을 정한 설문이 이걸 본다. 다음 로그인 때 갱신된다.
  teams: text('teams', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
})

export const visibilities = ['home', 'link', 'invited'] as const
export type Visibility = (typeof visibilities)[number]

// 설문 하나. 누가 고치고 결과를 보는지는 survey_editors 가 정한다.
export const surveys = sqliteTable('surveys', {
  id: text('id').primaryKey(), // nanoid 8자 (예: 'V1StGXR8')
  title: text('title').notNull(),
  description: text('description'),
  closesAt: text('closes_at'), // null 이면 계속 열려 있음
  // home: 로그인한 누구나 홈에서 보고 답한다. link: 링크를 받은 사람만. invited: survey_invitees 에 든 사람·팀만 보고 답한다.
  visibility: text('visibility', { enum: visibilities }).notNull().default('home'),
  // 공통 문항의 {program}, {activity} 같은 자리표시자를 채우는 값. 편집 UI 에서 공통 문항을 추가할 때 쓴다.
  vars: text('vars', { mode: 'json' }).$type<CommonVars>(),
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
  // true 면 결과 화면에서 이 문항의 답에만 응답자 GitHub 아이디를 붙인다 (운영진 모집처럼 연락이 필요한 문항).
  identified: integer('identified', { mode: 'boolean' }).notNull().default(false),
  // 유형별 설정. 모양은 각 유형 정의의 defaultConfig 가 정한다 (scale: min/max/라벨, choice: options).
  // unknown 대신 JsonValue 로 두는 이유: 서버 함수 반환 타입이 직렬화 가능해야 라우트의 loader 타입이 추론된다.
  config: text('config', { mode: 'json' }).$type<QuestionConfig>(),
})

// 설문을 고치고 결과를 보는 사람. 만든 사람이 처음 들어가고, 편집자가 다른 GitHub 계정을 더한다.
// login 으로 적으므로 아직 로그인한 적 없는 사람도 넣을 수 있다 (users 와 FK 없음).
export const surveyEditors = sqliteTable(
  'survey_editors',
  {
    surveyId: text('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    login: text('login').notNull(),
  },
  (t) => [primaryKey({ columns: [t.surveyId, t.login] })],
)

// visibility 가 invited 인 설문의 대상. 개인(GitHub login) 또는 DaleStudy 팀(slug). users 와 FK 없음 — 아직 로그인한 적 없는 사람도 넣는다.
export const surveyInvitees = sqliteTable(
  'survey_invitees',
  {
    surveyId: text('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['user', 'team'] }).notNull(),
    name: text('name').notNull(),
  },
  (t) => [primaryKey({ columns: [t.surveyId, t.kind, t.name] })],
)

export const responses = sqliteTable(
  'responses',
  {
    id: text('id').primaryKey(),
    surveyId: text('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    submittedAt: text('submitted_at').notNull(),
  },
  (t) => [uniqueIndex('responses_survey_user').on(t.surveyId, t.userId)],
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
