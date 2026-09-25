import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import { type Database, getDb } from '@/db'
import { questions, responses, surveyEditors, surveyInvitees, surveys } from '@/db/schema'
import { isClosed } from '@/lib/kst'
import { editedSurveyIds, isEditor } from '../access'
import { authMiddleware } from '../auth/middleware'
import { type QuestionInput, type SurveyFields, isValidLogin, newSurveyId, normalizeSurveyFields, parseInvitee, resolveQuestions } from '../survey-input'

// 편집자가 설문을 고치고 결과를 보는 서버 함수. 새 설문은 maintainer 팀(users.canCreateSurveys)만 만든다.
// 응답이 1건이라도 있으면 문항·vars 는 잠긴다 (answers 가 question id 를 참조하기 때문).

async function loadEditableSurvey(db: Database, surveyId: string, login: string) {
  const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, surveyId) })
  if (!survey) throw notFound()
  if (!(await isEditor(db, survey.id, login))) throw notFound()
  const [{ n: responseCount }] = await db.select({ n: count() }).from(responses).where(eq(responses.surveyId, survey.id))
  return { survey, responseCount, locked: responseCount > 0 }
}

// 마감된 설문은 고칠 수 없다. 관리 목록의 스위치로 다시 연 뒤에 고친다.
const CLOSED_MESSAGE = '마감된 설문은 고칠 수 없어요. 설문 관리에서 다시 연 뒤 고쳐 주세요'
async function loadOpenSurvey(db: Database, surveyId: string, login: string) {
  const loaded = await loadEditableSurvey(db, surveyId, login)
  if (isClosed(loaded.survey.closesAt)) throw new Error(CLOSED_MESSAGE)
  return loaded
}

// 관리 페이지: 내가 편집자인 설문과 설문별 응답 수
export const listManagedSurveys = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { user } }) => {
    const db = getDb(env.DB)
    const ids = await editedSurveyIds(db, user.login)
    const rows = ids.length
      ? await db
          .select({
            id: surveys.id,
            title: surveys.title,
            visibility: surveys.visibility,
            closesAt: surveys.closesAt,
            responseCount: count(responses.id),
          })
          .from(surveys)
          .leftJoin(responses, eq(responses.surveyId, surveys.id))
          .where(inArray(surveys.id, ids))
          .groupBy(surveys.id)
          .orderBy(desc(surveys.createdAt))
      : []
    return { canCreate: user.canCreateSurveys, surveys: rows.map((r) => ({ ...r, closed: isClosed(r.closesAt) })) }
  })

export const getSurveyForEdit = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey, responseCount, locked } = await loadEditableSurvey(db, data.surveyId, user.login)
    if (isClosed(survey.closesAt)) throw redirect({ to: '/manage' })
    const surveyQuestions = await db.query.questions.findMany({
      where: eq(questions.surveyId, survey.id),
      orderBy: asc(questions.position),
    })
    const editors = await db
      .select({ login: surveyEditors.login })
      .from(surveyEditors)
      .where(eq(surveyEditors.surveyId, survey.id))
      .orderBy(asc(surveyEditors.login))
    const invitees = await db
      .select({ kind: surveyInvitees.kind, name: surveyInvitees.name })
      .from(surveyInvitees)
      .where(eq(surveyInvitees.surveyId, survey.id))
      .orderBy(asc(surveyInvitees.kind), asc(surveyInvitees.name))
    return { ...survey, questions: surveyQuestions, editors: editors.map((e) => e.login), invitees, responseCount, locked }
  })

// 제목과 설명만 받는다. 나머지(마감·공개 범위·문항)는 편집 화면에서 정한다.
export const createSurvey = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { title: string; description: string | null }) => input)
  .handler(async ({ data, context: { user } }) => {
    if (!user.canCreateSurveys) throw new Error('새 설문은 DaleStudy 운영진(maintainer 팀)만 만들 수 있어요')
    const db = getDb(env.DB)
    const fields = normalizeSurveyFields({ ...data, visibility: 'home', closesAt: null, vars: null })
    const id = newSurveyId()
    await db.batch([
      db.insert(surveys).values({ id, ...fields, createdAt: new Date().toISOString() }),
      db.insert(surveyEditors).values({ surveyId: id, login: user.login }),
    ])
    return { id }
  })

export const updateSurvey = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string } & SurveyFields) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey, locked } = await loadOpenSurvey(db, data.surveyId, user.login)
    const fields = normalizeSurveyFields(data)

    if (locked) {
      if (JSON.stringify(fields.vars) !== JSON.stringify(survey.vars)) throw new Error('응답이 있는 설문은 공통 문항 변수를 바꿀 수 없어요')
    }

    await db.update(surveys).set(fields).where(eq(surveys.id, survey.id))
  })

// 문항은 전체 교체한다. 응답이 없을 때만 허용되므로 question id 가 바뀌어도 참조하는 답변이 없다.
export const saveQuestions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; questions: QuestionInput[] }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey, locked } = await loadOpenSurvey(db, data.surveyId, user.login)
    if (locked) throw new Error('응답이 있는 설문은 문항을 바꿀 수 없습니다')

    const rows = resolveQuestions(data.questions, survey.vars).map((row) => ({ ...row, surveyId: survey.id }))

    // D1 은 statement 당 바인딩 파라미터가 ~100개로 제한된다. 한 행에 8개이므로 10행씩 끊는다.
    const chunks = []
    for (let i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10))

    await db.batch([
      db.delete(questions).where(eq(questions.surveyId, survey.id)),
      ...chunks.map((chunk) => db.insert(questions).values(chunk)),
    ])
  })

// 마감일 전에 끝낸다. 마감은 closes_at 하나로 판단하므로 지금 시각을 넣는다. 응답이 있어도 된다. 관리 목록에서 부른다.
export const closeSurvey = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadEditableSurvey(db, data.surveyId, user.login)
    if (isClosed(survey.closesAt)) throw new Error('이미 마감된 설문이에요')
    const closesAt = new Date().toISOString()
    await db.update(surveys).set({ closesAt }).where(eq(surveys.id, survey.id))
    return { closesAt }
  })

// 마감된 설문을 마감일 없이 다시 연다. 새 마감일은 편집 화면에서 정한다.
export const reopenSurvey = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadEditableSurvey(db, data.surveyId, user.login)
    if (!isClosed(survey.closesAt)) throw new Error('진행 중인 설문이에요')
    await db.update(surveys).set({ closesAt: null }).where(eq(surveys.id, survey.id))
  })

export const deleteSurvey = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey, locked } = await loadOpenSurvey(db, data.surveyId, user.login)
    if (locked) throw new Error('응답이 있는 설문은 지울 수 없습니다')
    await db.batch([db.delete(questions).where(eq(questions.surveyId, survey.id)), db.delete(surveys).where(eq(surveys.id, survey.id))])
  })

export const addEditor = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; login: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadOpenSurvey(db, data.surveyId, user.login)
    const login = data.login.trim().replace(/^@/, '')
    if (!isValidLogin(login)) throw new Error('GitHub 아이디가 올바르지 않아요')
    await db.insert(surveyEditors).values({ surveyId: survey.id, login }).onConflictDoNothing()
  })

// 마지막 편집자는 뺄 수 없다. 편집자가 없으면 아무도 설문을 고치거나 결과를 볼 수 없다.
export const removeEditor = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; login: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadOpenSurvey(db, data.surveyId, user.login)
    const [{ n }] = await db.select({ n: count() }).from(surveyEditors).where(eq(surveyEditors.surveyId, survey.id))
    if (n <= 1) throw new Error('편집자가 한 명은 있어야 해요')
    await db.delete(surveyEditors).where(and(eq(surveyEditors.surveyId, survey.id), eq(surveyEditors.login, data.login)))
  })

// 대상(visibility = invited): "@login" 은 개인, "team:slug" 는 DaleStudy 팀. 바꾸면 바로 저장된다.
export const addInvitee = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; value: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadOpenSurvey(db, data.surveyId, user.login)
    await db.insert(surveyInvitees).values({ surveyId: survey.id, ...parseInvitee(data.value) }).onConflictDoNothing()
  })

export const removeInvitee = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; kind: 'user' | 'team'; name: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const { survey } = await loadOpenSurvey(db, data.surveyId, user.login)
    await db
      .delete(surveyInvitees)
      .where(and(eq(surveyInvitees.surveyId, survey.id), eq(surveyInvitees.kind, data.kind), eq(surveyInvitees.name, data.name)))
  })
