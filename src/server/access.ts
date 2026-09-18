import { and, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { cohorts, leaders } from '@/db/schema'

// 리더는 스터디 단위로 등록되므로 기수 → 스터디로 올라가서 확인한다.
export async function isLeaderOfCohort(db: Database, cohortId: string, login: string) {
  const [row] = await db
    .select({ login: leaders.login })
    .from(cohorts)
    .innerJoin(leaders, eq(leaders.studyId, cohorts.studyId))
    .where(and(eq(cohorts.id, cohortId), eq(leaders.login, login)))
    .limit(1)
  return Boolean(row)
}
