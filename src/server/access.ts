import { and, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { surveyEditors } from '@/db/schema'

// 설문의 편집자만 문항을 고치고 결과를 본다.
export async function isEditor(db: Database, surveyId: string, login: string) {
  const [row] = await db
    .select({ login: surveyEditors.login })
    .from(surveyEditors)
    .where(and(eq(surveyEditors.surveyId, surveyId), eq(surveyEditors.login, login)))
    .limit(1)
  return Boolean(row)
}

export async function editedSurveyIds(db: Database, login: string) {
  const rows = await db.select({ surveyId: surveyEditors.surveyId }).from(surveyEditors).where(eq(surveyEditors.login, login))
  return rows.map((r) => r.surveyId)
}
