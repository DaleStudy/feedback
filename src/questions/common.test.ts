import { describe, expect, test } from 'bun:test'
import { commonQuestions, renderLabel } from './common'

describe('renderLabel', () => {
  test('{activity}, {artifact} 를 vars 로 채운다', () => {
    expect(renderLabel('{activity} 들인 노력', { activity: '매주 글을 쓰는 데', artifact: '글' })).toBe('매주 글을 쓰는 데 들인 노력')
  })

  test('vars 에 없는 자리표시자는 실패한다', () => {
    expect(() => renderLabel('{unknown}', { activity: '', artifact: '' })).toThrow('{unknown}')
  })
})

describe('commonQuestions', () => {
  test('key 가 겹치지 않는다', () => {
    const keys = commonQuestions.map((q) => q.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('자리표시자는 activity, artifact 뿐이다', () => {
    for (const q of commonQuestions) {
      for (const [, name] of q.label.matchAll(/\{(\w+)\}/g)) expect(['activity', 'artifact']).toContain(name)
    }
  })
})
