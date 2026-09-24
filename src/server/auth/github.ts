// GitHub App 의 user-to-server OAuth 플로우.
// OAuth App 과 달리 scope 파라미터가 없고, 권한은 앱 설정에서 정해진다.

export function githubAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('state', params.state)
  return url.toString()
}

export async function exchangeCodeForToken(params: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  })
  const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !body.access_token) {
    throw new Error(`GitHub token exchange failed: ${body.error_description ?? body.error ?? res.status}`)
  }
  return body.access_token
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'dalestudy-feedback',
    },
  })
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`)
  return (await res.json()) as GitHubUser
}

// 새 설문을 만들 수 있는 사람: DaleStudy 조직의 maintainer 팀 ("운영진"). 명단은 GitHub 이 관리한다.
export const SURVEY_CREATORS = { org: 'DaleStudy', team: 'maintainer' } as const

// 팀 멤버가 아니면 GitHub 이 404 를 준다. 그 밖의 실패도 권한 없음으로 본다.
export async function isTeamMember(token: string, org: string, team: string, login: string) {
  const res = await fetch(`https://api.github.com/orgs/${org}/teams/${team}/memberships/${encodeURIComponent(login)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'dalestudy-feedback' },
  })
  if (!res.ok) return false
  const body = (await res.json()) as { state?: string }
  return body.state === 'active'
}
