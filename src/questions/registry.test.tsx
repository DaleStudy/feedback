import { describe, expect, test } from 'bun:test'
import { resolveConfig, validateAnswer } from './registry'

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
