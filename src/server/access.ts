import { and, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { type Visibility, surveyEditors, surveyInvitees, surveys } from '@/db/schema'

export type Manager = { login: string; canCreateSurveys: boolean }

// 문항을 고치고 결과를 보는 사람: 운영진(maintainer 팀)은 모든 설문, 그 밖에는 설문마다 더한 편집자(survey_editors).
export async function isEditor(db: Database, surveyId: string, { login, canCreateSurveys }: Manager) {
  if (canCreateSurveys) return true
  const [row] = await db
    .select({ login: surveyEditors.login })
    .from(surveyEditors)
    .where(and(eq(surveyEditors.surveyId, surveyId), eq(surveyEditors.login, login)))
    .limit(1)
  return Boolean(row)
}

export async function editedSurveyIds(db: Database, { login, canCreateSurveys }: Manager) {
  if (canCreateSurveys) return (await db.select({ id: surveys.id }).from(surveys)).map((r) => r.id)
  const rows = await db.select({ surveyId: surveyEditors.surveyId }).from(surveyEditors).where(eq(surveyEditors.login, login))
  return rows.map((r) => r.surveyId)
}

// 이 사람이 설문에 답할 수 있나. invited 설문은 대상 명단(개인 login 또는 팀)에 들어야 한다. 편집자는 늘 된다.
export async function canRespond(
  db: Database,
  survey: { id: string; visibility: Visibility },
  user: Manager & { teams: string[] },
) {
  if (survey.visibility !== 'invited') return true
  const invitees = await db.select().from(surveyInvitees).where(eq(surveyInvitees.surveyId, survey.id))
  if (isInvited(invitees, user)) return true
  return isEditor(db, survey.id, user)
}

export function isInvited(invitees: Array<{ kind: 'user' | 'team'; name: string }>, user: { login: string; teams: string[] }) {
  const login = user.login.toLowerCase()
  return invitees.some((i) => (i.kind === 'user' ? i.name.toLowerCase() === login : user.teams.includes(i.name)))
}

// 홈에 보일 invited 설문 id: 내 login 이나 내 팀이 대상에 든 설문
export async function invitedSurveyIds(db: Database, user: { login: string; teams: string[] }) {
  const rows = await db.select().from(surveyInvitees)
  return [...new Set(rows.filter((r) => isInvited([r], user)).map((r) => r.surveyId))]
}
