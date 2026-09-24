import { describe, expect, test } from 'bun:test'
import { estimateMinutes, questionBehavior, resolveConfig, validateAnswer, validateConfig } from './registry'

describe('validateAnswer', () => {
  test('scale 은 config 의 min~max 만 허용한다', () => {
    const q = { type: 'scale' as const, config: null }
    expect(validateAnswer(q, '3')).toBeNull()
    expect(validateAnswer(q, '6')).toContain('1~5')
    expect(validateAnswer({ type: 'scale', config: { min: 0, max: 10 } }, '10')).toBeNull()
  })

  test('choice 는 options 에 있는 값만 허용한다', () => {
    const q = { type: 'choice' as const, config: { options: ['있다', '없다'] } }
    expect(validateAnswer(q, '있다')).toBeNull()
    expect(validateAnswer(q, '아마도')).toContain('보기에 없는')
  })

  test('short, long 은 값을 검사하지 않는다', () => {
    expect(validateAnswer({ type: 'short', config: null }, '아무거나')).toBeNull()
    expect(validateAnswer({ type: 'long', config: null }, '')).toBeNull()
  })
})

describe('resolveConfig', () => {
  test('seed 의 config 가 기본값 위에 얹힌다', () => {
    expect(resolveConfig({ type: 'scale', config: { maxLabel: '적극적으로 했다' } })).toEqual({
      min: 1,
      max: 5,
      minLabel: '전혀 아니다',
      maxLabel: '적극적으로 했다',
    })
  })
})

describe('validateConfig', () => {
  test('scale 은 min < max 인 정수 범위여야 한다', () => {
    expect(validateConfig({ type: 'scale', config: null })).toBeNull()
    expect(validateConfig({ type: 'scale', config: { min: 5, max: 5 } })).toContain('작아야')
    expect(validateConfig({ type: 'scale', config: { min: 1.5, max: 5 } })).toContain('정수')
    expect(validateConfig({ type: 'scale', config: { min: 0, max: 100 } })).toContain('11단계')
  })

  test('choice 는 겹치지 않는 보기가 둘 이상이어야 한다', () => {
    expect(validateConfig({ type: 'choice', config: { options: ['있다', '없다'] } })).toBeNull()
    expect(validateConfig({ type: 'choice', config: null })).toContain('두 개 이상')
    expect(validateConfig({ type: 'choice', config: { options: ['있다', ''] } })).toContain('두 개 이상')
    expect(validateConfig({ type: 'choice', config: { options: ['있다', '있다'] } })).toContain('겹칩니다')
  })

  test('short, long 은 설정이 없다', () => {
    expect(validateConfig({ type: 'short', config: null })).toBeNull()
    expect(validateConfig({ type: 'long', config: { anything: 1 } })).toBeNull()
  })
})

describe('estimateMinutes', () => {
  test('유형별 시간을 더해 분으로 반올림한다', () => {
    // 블로그 1기 참여 회고: 척도 3 + 서술 5 + 선택 1 = 45 + 200 + 15 = 260초
    expect(estimateMinutes(['scale', 'scale', 'scale', 'long', 'long', 'long', 'long', 'choice', 'long'])).toBe(4)
    expect(estimateMinutes([])).toBe(1)
  })
})

describe('questionBehavior', () => {
  test('고르는 유형만 자동으로 넘어간다', () => {
    expect(questionBehavior('scale').autoAdvance).toBe(true)
    expect(questionBehavior('choice').autoAdvance).toBe(true)
    expect(questionBehavior('long').autoAdvance).toBe(false)
    expect(questionBehavior('short').autoAdvance).toBe(false)
  })
})
