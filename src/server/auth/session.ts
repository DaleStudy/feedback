import { eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { sessions, users } from '@/db/schema'
import { randomToken } from './cookies'

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30일

export type SessionUser = typeof users.$inferSelect

export async function createSession(db: Database, userId: number) {
  const id = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  await db.insert(sessions).values({ id, userId, expiresAt })
  return id
}

export async function deleteSession(db: Database, id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function findSessionUser(db: Database, id: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1)
  if (!row) return null
  if (row.expiresAt < new Date().toISOString()) {
    await deleteSession(db, id)
    return null
  }
  return row.user
}
