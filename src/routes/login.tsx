import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { OAUTH_COOKIE, randomToken, serializeCookie } from '@/server/auth/cookies'
import { githubAuthorizeUrl } from '@/server/auth/github'

// GET /login?redirect=/xxx → GitHub authorize 로 보낸다.
// state 와 돌아올 경로를 10분짜리 쿠키에 담아 두고 콜백에서 대조한다.
export const Route = createFileRoute('/login')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const wanted = url.searchParams.get('redirect') ?? '/'
        // 같은 사이트의 절대 경로만 허용 (open redirect 방지)
        const redirectTo = wanted.startsWith('/') && !wanted.startsWith('//') ? wanted : '/'
        const state = randomToken(16)

        const headers = new Headers({
          Location: githubAuthorizeUrl({
            clientId: env.GITHUB_CLIENT_ID,
            redirectUri: `${url.origin}/auth/callback`,
            state,
          }),
        })
        headers.append('Set-Cookie', serializeCookie(OAUTH_COOKIE, `${state}.${encodeURIComponent(redirectTo)}`, 600))
        return new Response(null, { status: 302, headers })
      },
    },
  },
})
