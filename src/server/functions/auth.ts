import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { getDb } from '@/db'
import { SESSION_COOKIE, readCookie, serializeCookie } from '../auth/cookies'
import { getSessionUser } from '../auth/current-user'
import { deleteSession } from '../auth/session'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getSessionUser()
  if (!user) return null
  return { login: user.login, name: user.name, avatarUrl: user.avatarUrl }
})

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const token = readCookie(getRequestHeader('cookie'), SESSION_COOKIE)
  if (token) await deleteSession(getDb(env.DB), token)
  setResponseHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0))
})
