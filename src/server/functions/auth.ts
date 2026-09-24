import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { getDb } from '@/db'
import { SESSION_COOKIE, readCookie, serializeCookie } from '../auth/cookies'
import { getSessionUser } from '../auth/current-user'
import { deleteSession } from '../auth/session'
import { editedSurveyIds } from '../access'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getSessionUser()
  if (!user) return null
  // 헤더의 "관리" 탭을 보일지 정한다. 권한 판정은 각 서버 함수가 따로 한다.
  const edits = await editedSurveyIds(getDb(env.DB), user.login)
  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    canCreateSurveys: user.canCreateSurveys,
    canManage: user.canCreateSurveys || edits.length > 0,
  }
})

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const token = readCookie(getRequestHeader('cookie'), SESSION_COOKIE)
  if (token) await deleteSession(getDb(env.DB), token)
  setResponseHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0))
})
