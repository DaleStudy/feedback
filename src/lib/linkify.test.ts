import { describe, expect, test } from 'bun:test'
import { linkParts } from './linkify'

describe('linkParts', () => {
  test('주소가 없으면 글 하나', () => {
    expect(linkParts('그냥 글')).toEqual([{ text: '그냥 글' }])
  })

  test('주소를 링크 조각으로 나누고 끝의 문장부호는 뺀다', () => {
    expect(linkParts('요약(https://github.com/a/b#c)을 보세요.')).toEqual([
      { text: '요약(' },
      { text: 'https://github.com/a/b#c', href: 'https://github.com/a/b#c' },
      { text: ')을 보세요.' },
    ])
  })
})
