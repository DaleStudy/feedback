import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { answers, cohorts, leaders, questions, responses, studies, surveys } from '@/db/schema'
import { isLeaderOfCohort } from '../access'
import { authMiddleware } from '../auth/middleware'
import { anonymousRespondentKey } from '../respondent-key'
import { validateAnswer } from '@/questions/registry'

function isClosed(closesAt: string | null) {
  return closesAt !== null && closesAt < new Date().toISOString()
}

async function respondentKeyFor(survey: { id: string; anonymous: boolean }, user: { id: number; login: string }) {
  return survey.anonymous ? anonymousRespondentKey(env.HMAC_SECRET, survey.id, user.id) : user.login
}

// 답할 수 있는 설문 전부와 내가 결과를 볼 설문.
// 참가자 명단은 두지 않는다. 링크는 스터디 채널에만 공유되고, 로그인 + 중복 방지로 충분하다.
export const listMySurveys = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context: { user } }) => {
    const db = getDb(env.DB)

    const surveyCard = {
      id: surveys.id,
      title: surveys.title,
      closesAt: surveys.closesAt,
      anonymous: surveys.anonymous,
      cohortName: cohorts.name,
      studyName: studies.name,
    }

    const toAnswer = await db
      .select(surveyCard)
      .from(surveys)
      .innerJoin(cohorts, eq(cohorts.id, surveys.cohortId))
      .innerJoin(studies, eq(studies.id, cohorts.studyId))
      .orderBy(desc(surveys.createdAt))

    const toReview = await db
      .select(surveyCard)
      .from(surveys)
      .innerJoin(cohorts, eq(cohorts.id, surveys.cohortId))
      .innerJoin(studies, eq(studies.id, cohorts.studyId))
      .innerJoin(leaders, and(eq(leaders.studyId, studies.id), eq(leaders.login, user.login)))
      .orderBy(desc(surveys.createdAt))

    // 이미 답한 설문 표시: 설문별 내 응답자 키와 일치하는 응답이 있는지 본다
    const myKeys = new Map(
      await Promise.all(toAnswer.map(async (s) => [s.id, await respondentKeyFor(s, user)] as const)),
    )
    const existing = toAnswer.length
      ? await db
          .select({ surveyId: responses.surveyId, respondentKey: responses.respondentKey })
          .from(responses)
          .where(inArray(responses.surveyId, toAnswer.map((s) => s.id)))
      : []
    const answeredIds = new Set(
      existing.filter((r) => myKeys.get(r.surveyId) === r.respondentKey).map((r) => r.surveyId),
    )

    return {
      toAnswer: toAnswer.map((s) => ({ ...s, answered: answeredIds.has(s.id), closed: isClosed(s.closesAt) })),
      toReview,
    }
  })

export const getSurvey = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: { surveyId: string }) => input)
  .handler(async ({ data, context: { user } }) => {
    const db = getDb(env.DB)
    const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, data.surveyId) })
    if (!survey) throw notFound()

    const leader = await isLeaderOfCohort(db, survey.cohortId, user.login)

    const surveyQuestions = await db.query.questions.findMany({
      where: eq(questions.surveyId, survey.id),
      orderBy: asc(questions.position),
    })

    const key = await respondentKeyFor(survey, user)
    const existing = await db.query.responses.findFirst({
      where: and(eq(responses.surveyId, survey.id), eq(responses.respondentKey, key)),
    })

    return {
      ...survey,
      closed: isClosed(survey.closesAt),
      questions: surveyQuestions,
      canReview: leader,
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

    const surveyQuestions = await db.query.questions.findMany({ where: eq(questions.surveyId, survey.id) })
    const byId = new Map(surveyQuestions.map((q) => [q.id, q]))
    const given = new Map(data.answers.map((a) => [a.questionId, a.value.trim()]))

    for (const q of surveyQuestions) {
      const value = given.get(q.id) ?? ''
      if (q.required && !value) throw new Error(`필수 항목입니다: ${q.label}`)
      const problem = value ? validateAnswer(q, value) : null
      if (problem) throw new Error(`${problem}: ${q.label}`)
    }

    const key = await respondentKeyFor(survey, user)
    const existing = await db.query.responses.findFirst({
      where: and(eq(responses.surveyId, survey.id), eq(responses.respondentKey, key)),
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
      db.insert(responses).values({ id: responseId, surveyId: survey.id, respondentKey: key, submittedAt: new Date().toISOString() }),
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
    if (!(await isLeaderOfCohort(db, survey.cohortId, user.login))) throw notFound()

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

    return {
      id: survey.id,
      title: survey.title,
      anonymous: survey.anonymous,
      responseCount: surveyResponses.length,
      // 실명 설문일 때만 응답자 목록을 준다
      respondents: survey.anonymous ? null : surveyResponses.map((r) => r.respondentKey),
      questions: surveyQuestions.map((q) => ({
        id: q.id,
        key: q.key,
        type: q.type,
        label: q.label,
        config: q.config,
        values: byQuestion.get(q.id) ?? [],
      })),
    }
  })
