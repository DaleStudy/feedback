import { describe, expect, test } from 'bun:test'
import { type CommonVars, commonQuestions, renderLabel } from './common'

const blog: CommonVars = {
  program: '스터디',
  period: '이번 기수에서',
  activity: '매주 글을 쓰는 데',
  artifact: '글',
  redo: '같은 스터디를 다시 한다면',
  next: '다음 기수에 다시',
}

describe('renderLabel', () => {
  test('자리표시자를 vars 로 채운다', () => {
    expect(renderLabel('{activity} 들인 노력', blog)).toBe('매주 글을 쓰는 데 들인 노력')
  })

  test('뒤따르는 조사를 받침에 맞춘다', () => {
    expect(renderLabel('{artifact}을', { ...blog, artifact: '글' })).toBe('글을')
    expect(renderLabel('{artifact}을', { ...blog, artifact: '풀이' })).toBe('풀이를')
    expect(renderLabel('{program}이', { ...blog, program: '프로젝트' })).toBe('프로젝트가')
    expect(renderLabel('{artifact}을', { ...blog, artifact: 'PR' })).toBe('PR을(를)')
  })

  test('vars 에 없는 자리표시자는 실패한다', () => {
    expect(() => renderLabel('{unknown}', blog)).toThrow('{unknown}')
  })
})

describe('commonQuestions', () => {
  test('key 가 겹치지 않는다', () => {
    const keys = commonQuestions.map((q) => q.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('자리표시자는 CommonVars 에 있는 이름만 쓴다', () => {
    for (const q of commonQuestions) {
      for (const [, name] of q.label.matchAll(/\{(\w+)\}/g)) expect(Object.keys(blog)).toContain(name)
    }
  })

  // 프로덕션 blog01-final 에 이미 저장된 문구. 여기가 깨지면 기수 간 비교가 끊긴다.
  test('블로그 스터디 vars 로 렌더링한 문구가 바뀌지 않았다', () => {
    const rendered = Object.fromEntries(commonQuestions.map((q) => [q.key, renderLabel(q.label, blog)]))
    expect(rendered).toEqual({
      goal_achieved: '시작할 때 이 스터디에서 하고 싶었던 것을 얼마나 해냈나요?',
      effort_satisfied: '매주 글을 쓰는 데 들인 노력에 스스로 만족하나요?',
      gave_back: '다른 참가자의 글을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요?',
      highlight_lowlight: '이번 기수에서 잘한 것 하나와 아쉬운 것 하나를 적어주세요.',
      do_differently: '같은 스터디를 다시 한다면 무엇을 다르게 하시겠어요?',
      community_help: '그렇게 하는 데 커뮤니티(운영진이나 다른 참가자)가 어떤 도움을 주면 좋을까요?',
      rejoin: '다음 기수에 다시 참여할 생각이 있나요?',
      dropout: '중간에 그만두셨다면, 그때 무엇이 달랐다면 계속할 수 있었을까요?',
    })
  })
})
