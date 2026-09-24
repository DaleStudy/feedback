import { describe, expect, test } from 'bun:test'
import { toCsv } from './csv'

describe('toCsv', () => {
  test('BOM 을 붙이고 줄은 CRLF 로 잇는다', () => {
    expect(toCsv([['a', 'b'], ['1', '2']])).toBe('﻿a,b\r\n1,2')
  })

  test('쉼표·따옴표·줄바꿈이 든 칸은 따옴표로 감싼다', () => {
    expect(toCsv([['주제, 마감', '"순위"', '한 줄\n두 줄']])).toBe('﻿"주제, 마감","""순위""","한 줄\n두 줄"')
  })
})
