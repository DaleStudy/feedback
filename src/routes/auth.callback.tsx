import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { and, eq, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { OAUTH_COOKIE, SESSION_COOKIE, readCookie, serializeCookie } from '@/server/auth/cookies'
import { SURVEY_CREATORS, exchangeCodeForToken, fetchGitHubUser, isTeamMember } from '@/server/auth/github'
import { SESSION_TTL_SECONDS, createSession } from '@/server/auth/session'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const saved = readCookie(request.headers.get('cookie'), OAUTH_COOKIE)
        if (!code || !state || !saved) return new Response('잘못된 로그인 요청입니다', { status: 400 })

        const dot = saved.indexOf('.')
        const savedState = saved.slice(0, dot)
        const redirectTo = decodeURIComponent(saved.slice(dot + 1)) || '/'
        if (savedState !== state) return new Response('state 가 일치하지 않습니다', { status: 400 })

        const token = await exchangeCodeForToken({
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          code,
          redirectUri: `${url.origin}/auth/callback`,
        })
        const gh = await fetchGitHubUser(token)
        // 팀이 바뀌면 다음 로그인 때 반영된다 (세션 30일)
        const canCreateSurveys = await isTeamMember(token, SURVEY_CREATORS.org, SURVEY_CREATORS.team, gh.login)

        const db = getDb(env.DB)
        // GitHub login 은 바뀔 수 있다. 같은 login 을 다른 id 가 갖고 있으면 그쪽이 옛 이름이므로 비켜 준다.
        await db
          .update(users)
          .set({ login: sql`${users.login} || '#' || ${users.id}` })
          .where(and(eq(users.login, gh.login), ne(users.id, gh.id)))
        await db
          .insert(users)
          .values({
            id: gh.id,
            login: gh.login,
            name: gh.name,
            avatarUrl: gh.avatar_url,
            canCreateSurveys,
            createdAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { login: gh.login, name: gh.name, avatarUrl: gh.avatar_url, canCreateSurveys },
          })
        const sessionId = await createSession(db, gh.id)

        const headers = new Headers({ Location: redirectTo })
        headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, sessionId, SESSION_TTL_SECONDS))
        headers.append('Set-Cookie', serializeCookie(OAUTH_COOKIE, '', 0))
        return new Response(null, { status: 302, headers })
      },
    },
  },
})
