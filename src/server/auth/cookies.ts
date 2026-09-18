// 쿠키 문자열 조립/파싱. 서버 함수(getRequestHeader)와 서버 라우트(Request) 양쪽에서 쓴다.

export const SESSION_COOKIE = '__Host-session'
export const OAUTH_COOKIE = '__Host-oauth'

// __Host- 접두사는 Secure + Path=/ + Domain 없음을 브라우저가 강제한다.
// *.dalestudy.com 에 서비스가 여럿이라 서브도메인 간 쿠키 오염을 막는 데 의미가 있다.
export function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  return [
    `${name}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ')
}

export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    // 값에 '=' 가 들어갈 수 있으므로 첫 '=' 에서만 자른다.
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) return part.slice(eq + 1)
  }
  return null
}

export function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...buf))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}
