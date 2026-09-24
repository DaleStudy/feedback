import { describe, expect, test } from 'bun:test'
import { randomToken, readCookie, serializeCookie } from './cookies'

describe('readCookie', () => {
  test('이름이 일치하는 쿠키 값을 돌려준다', () => {
    expect(readCookie('a=1; __Host-session=abc; b=2', '__Host-session')).toBe('abc')
  })

  test("값에 '=' 가 있어도 첫 '=' 에서만 자른다", () => {
    expect(readCookie('__Host-oauth=state.%2Fsurveys%3Fx%3D1', '__Host-oauth')).toBe('state.%2Fsurveys%3Fx%3D1')
  })

  test('헤더가 없거나 이름이 없으면 null', () => {
    expect(readCookie(null, 'x')).toBeNull()
    expect(readCookie('a=1', 'x')).toBeNull()
  })
})

describe('serializeCookie', () => {
  test('HttpOnly, Secure, SameSite=Lax, Path=/ 를 항상 붙인다', () => {
    expect(serializeCookie('__Host-session', 'v', 60)).toBe(
      '__Host-session=v; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=60',
    )
  })
})

describe('randomToken', () => {
  test('URL 에 안전한 문자만 쓰고 매번 다르다', () => {
    const a = randomToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(randomToken()).not.toBe(a)
  })
})
