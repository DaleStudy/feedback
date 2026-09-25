import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { type QuestionType, answers, questions, responses, surveys, users } from '@/db/schema'
import { canRespond, invitedSurveyIds, isEditor } from '../access'
import { authMiddleware } from '../auth/middleware'
import { isClosed } from '@/lib/kst'
import { estimateMinutes, validateAnswer } from '@/questions/registry'

// 홈에 보일 설문: 홈 공개(home) 설문 전부, 내가 대상인 invited 설문, 내가 이미 답한 설문.
// 설문 관리는 /manage (functions/manage.ts).
export const listMySurveys = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { user } }) => {
    const db = getDb(env.DB)
    const all = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        closesAt: surveys.closesAt,
        visibility: surveys.visibility,
      })
      .from(surveys)
      .orderBy(desc(surveys.createdAt))
    if (all.length === 0) return []

    const mine = await db.select({ surveyId: responses.surveyId }).from(responses).where(eq(responses.userId, user.id))
    const answeredIds = new Set(mine.map((r) => r.surveyId))

    const invited = new Set(await invitedSurveyIds(db, user))
    const visible = all.filter((s) => s.visibility === 'home' || invited.has(s.id) || answeredIds.has(s.id))
    const types = new Map<string, QuestionType[]>()
    if (visible.length) {
      const rows = await db
        .select({ surveyId: questions.surveyId, type: questions.type })
        .from(questions)
        .where(inArray(questions.surveyId, visible.map((s) => s.id)))
      for (const q of rows) types.set(q.surveyId, [...(types.get(q.surveyId) ?? []), q.type])
    }

    return visible.map(({ visibility: _visibility, ...s }) => ({
      ...s,
      questionCount: types.get(s.id)?.length ?? 0,
      minutes: estimateMinutes(types.get(s.id) ?? []),
      answered: answeredIds.has(s.id),
      closed: isClosed(s.closesAt),
    }))
  })

// 로그인 전에 보이는 설문 소개. 이 파일에서 authMiddleware 가 없는 유일한 함수다 —
// SNS 미리보기 봇도 로그인하지 않으므로 이게 있어야 링크 미리보기가 뜬다. 소개(제목·설명·마감)만 주고 문항과 응답은 주지 않는다.
export const getSurveyPreview = createServerFn({ method: 'GET' })
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data }) => {
    const db = getDb(env.DB)
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, data.surveyId),
      columns: { id: true, title: true, description: true, closesAt: true },
    })
    if (!survey) throw notFound()
    const types = (await db.select({ type: questions.type }).from(questions).where(eq(questions.surveyId, survey.id))).map((q) => q.type)
    return { ...survey, closed: isClosed(survey.closesAt), questionCount: types.length, minutes: estimateMinutes(types) }
  })

export const getSurvey = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, data.surveyId) })
    if (!survey) throw notFound()

    // 대상이 아니면 문항을 주지 않는다. 응답 화면은 "대상이 아니에요" 를 보여 준다.
    const allowed = await canRespond(db, survey, user)
    const surveyQuestions = allowed
      ? await db.query.questions.findMany({ where: eq(questions.surveyId, survey.id), orderBy: asc(questions.position) })
      : []

    const existing = await db.query.responses.findFirst({
      where: and(eq(responses.surveyId, survey.id), eq(responses.userId, user.id)),
    })

    return {
      ...survey,
      allowed,
      closed: isClosed(survey.closesAt),
      minutes: estimateMinutes(surveyQuestions.map((q) => q.type)),
      questions: surveyQuestions,
      canReview: await isEditor(db, survey.id, user.login),
      answered: Boolean(existing),
    }
  })

export const submitResponse = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string; answers: Array<{ questionId: number; value: string }> }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, data.surveyId) })
    if (!survey) throw notFound()
    if (isClosed(survey.closesAt)) throw new Error('마감된 설문입니다')
    if (!(await canRespond(db, survey, user))) throw new Error('이 설문의 대상이 아니에요')

    const surveyQuestions = await db.query.questions.findMany({ where: eq(questions.surveyId, survey.id) })
    const byId = new Map(surveyQuestions.map((q) => [q.id, q]))
    const given = new Map(data.answers.map((a) => [a.questionId, a.value.trim()]))

    for (const q of surveyQuestions) {
      const value = given.get(q.id) ?? ''
      if (q.required && !value) throw new Error(`필수 항목입니다: ${q.label}`)
      const problem = value ? validateAnswer(q, value) : null
      if (problem) throw new Error(`${problem}: ${q.label}`)
    }

    const existing = await db.query.responses.findFirst({
      where: and(eq(responses.surveyId, survey.id), eq(responses.userId, user.id)),
    })
    if (existing) throw new Error('이미 응답한 설문입니다')

    const responseId = crypto.randomUUID()
    const rows = [...given]
      .filter(([questionId, value]) => byId.has(questionId) && value)
      .map(([questionId, value]) => ({ responseId, questionId, value }))

    // D1 은 statement 당 바인딩 파라미터가 ~100개로 제한된다. 한 행에 3개이므로 10행씩 끊는다.
    const chunks = []
    for (let i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10))

    await db.batch([
      db.insert(responses).values({ id: responseId, surveyId: survey.id, userId: user.id, submittedAt: new Date().toISOString() }),
      ...chunks.map((chunk) => db.insert(answers).values(chunk)),
    ])
  })

export const getSurveyResults = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, data.surveyId) })
    if (!survey) throw notFound()
    if (!(await isEditor(db, survey.id, user.login))) throw notFound()

    const surveyQuestions = await db.query.questions.findMany({
      where: eq(questions.surveyId, survey.id),
      orderBy: asc(questions.position),
    })
    const surveyResponses = await db.query.responses.findMany({
      where: eq(responses.surveyId, survey.id),
      orderBy: asc(responses.submittedAt),
    })
    const allAnswers = surveyResponses.length
      ? await db
          .select()
          .from(answers)
          .where(inArray(answers.responseId, surveyResponses.map((r) => r.id)))
      : []

    const byQuestion = new Map<number, string[]>()
    for (const a of allAnswers) {
      byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a.value])
    }

    // 실명 문항(identified)의 답에만 응답자 아이디를 붙인다. 나머지 문항은 누가 답했는지 주지 않는다.
    const identifiedIds = new Set(surveyQuestions.filter((q) => q.identified).map((q) => q.id))
    const named = new Map<number, Array<{ login: string; value: string }>>()
    if (identifiedIds.size) {
      const logins = new Map(
        (
          await db
            .select({ responseId: responses.id, login: users.login })
            .from(responses)
            .innerJoin(users, eq(users.id, responses.userId))
            .where(eq(responses.surveyId, survey.id))
        ).map((r) => [r.responseId, r.login]),
      )
      for (const a of allAnswers) {
        if (!identifiedIds.has(a.questionId)) continue
        named.set(a.questionId, [...(named.get(a.questionId) ?? []), { login: logins.get(a.responseId) ?? '?', value: a.value }])
      }
    }

    // CSV 내려받기용: 응답 한 건이 한 줄. 누가 냈는지는 넣지 않는다.
    const byResponse = new Map<string, Map<number, string>>()
    for (const a of allAnswers) {
      if (!byResponse.has(a.responseId)) byResponse.set(a.responseId, new Map())
      byResponse.get(a.responseId)?.set(a.questionId, a.value)
    }
    const table = {
      header: ['제출 시각', ...surveyQuestions.map((q) => `${q.position}. ${q.label}`)],
      rows: surveyResponses.map((r) => [r.submittedAt, ...surveyQuestions.map((q) => byResponse.get(r.id)?.get(q.id) ?? '')]),
    }

    return {
      id: survey.id,
      title: survey.title,
      closesAt: survey.closesAt,
      closed: isClosed(survey.closesAt),
      // 누가 답했는지는 주지 않는다. 답변만 문항별로 모은다.
      responseCount: surveyResponses.length,
      table,
      questions: surveyQuestions.map((q) => ({
        id: q.id,
        position: q.position,
        key: q.key,
        type: q.type,
        label: q.label,
        required: q.required,
        config: q.config,
        values: byQuestion.get(q.id) ?? [],
        respondents: q.identified ? (named.get(q.id) ?? []) : null,
      })),
    }
  })
