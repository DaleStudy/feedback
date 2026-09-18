import { describe, expect, test } from 'bun:test'
import { anonymousRespondentKey } from './respondent-key'

describe('anonymousRespondentKey', () => {
  test('같은 입력이면 같은 키, 설문이나 사용자가 다르면 다른 키', async () => {
    const a = await anonymousRespondentKey('secret', 'blog-2-final', 1)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await anonymousRespondentKey('secret', 'blog-2-final', 1)).toBe(a)
    expect(await anonymousRespondentKey('secret', 'blog-2-final', 2)).not.toBe(a)
    expect(await anonymousRespondentKey('secret', 'blog-3-final', 1)).not.toBe(a)
  })

  test('secret 이 다르면 다른 키 (공개 정보만으로 역산 불가)', async () => {
    expect(await anonymousRespondentKey('a', 's', 1)).not.toBe(await anonymousRespondentKey('b', 's', 1))
  })

  test('secret 이 비어 있으면 실패한다', async () => {
    await expect(anonymousRespondentKey('', 's', 1)).rejects.toThrow('HMAC_SECRET')
  })
})
