import { getRequestHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { getDb } from '@/db'
import { SESSION_COOKIE, readCookie } from './cookies'
import { findSessionUser } from './session'

// 서버 함수 안에서 현재 요청의 세션 사용자를 읽는다. 없으면 null.
export async function getSessionUser() {
  const token = readCookie(getRequestHeader('cookie'), SESSION_COOKIE)
  if (!token) return null
  return findSessionUser(getDb(env.DB), token)
}
