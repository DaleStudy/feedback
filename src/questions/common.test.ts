import { describe, expect, test } from 'bun:test'
import { type CommonVars, commonQuestions, commonQuestionsFor, renderLabel } from './common'

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

  // 블로그 스터디 1기 설문에 이미 저장된 문구. 여기가 깨지면 기수 간 비교가 끊긴다.
  test('블로그 스터디 vars 로 렌더링한 문구가 바뀌지 않았다', () => {
    const rendered = Object.fromEntries(commonQuestions.map((q) => [q.key, renderLabel(q.label, blog)]))
    expect(rendered).toEqual({
      goal_achieved: '시작할 때 이 스터디에서 하고 싶었던 것을 얼마나 해냈나요?',
      effort_satisfied: '매주 글을 쓰는 데 들인 노력에 스스로 만족하나요?',
      gave_back: '다른 참가자의 글을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요?',
      highlight: '이번 기수에서 내가 잘한 것 하나를 적어주세요.',
      lowlight: '이번 기수에서 나 스스로 아쉬웠던 것 하나를 적어주세요.',
      do_differently: '같은 스터디를 다시 한다면 무엇을 다르게 하시겠어요?',
      community_help: '그렇게 하는 데 운영진이나 다른 참가자가 어떤 도움을 주면 좋을까요?',
      recommend: '이 스터디를 주변 개발자에게 추천하시겠어요?',
      rejoin: '다음 기수에 다시 참여할 생각이 있나요?',
      join_organizers: '다르게 해보고 싶은 것이 있었다면, 운영진이 되어 직접 바꿔 보는 건 어때요? 관심 있다면 연락받을 Discord 사용자명을 남겨 주세요.',
      organizer_goal_achieved: '시작할 때 운영자로서 하고 싶었던 것을 얼마나 해냈나요?',
      organizer_sustainable: '운영에 들인 시간과 에너지는 다음에도 이어갈 수 있는 수준이었나요?',
      organizer_presence: '참가자의 질문과 글에 반응하는 데 얼마나 시간을 쓸 수 있었나요?',
      organizer_highlight: '이번 기수에서 운영자로서 잘한 것 하나를 적어주세요.',
      organizer_lowlight: '이번 기수에서 운영자로서 아쉬웠던 것 하나를 적어주세요.',
      organizer_do_differently: '같은 스터디를 다시 한다면 운영 방식에서 무엇을 다르게 하시겠어요?',
      organizer_help: '그렇게 하는 데 커뮤니티 차원에서 다른 운영진이 어떤 도움을 주면 좋을까요?',
      organizer_automate: '반복 작업 중 자동화하거나 아예 없애고 싶은 것이 있다면 적어주세요.',
      organizer_continue: '다음 기수에 다시 운영을 맡을 생각이 있나요?',
      survey_feedback: '헷갈렸던 문항이나 다음 설문에서 더 물어봤으면 하는 게 있었다면 알려주세요.',
    })
  })
})

describe('commonQuestionsFor', () => {
  test('대상별 기본 문항 끝에 양쪽 문항이 붙는다', () => {
    const participants = commonQuestionsFor('participants').map((q) => q.key)
    const organizers = commonQuestionsFor('organizers').map((q) => q.key)
    expect(participants.at(-1)).toBe('survey_feedback')
    expect(organizers.at(-1)).toBe('survey_feedback')
    expect(participants.some((k) => k.startsWith('organizer_'))).toBe(false)
    expect(organizers.every((k) => k.startsWith('organizer_') || k === 'survey_feedback')).toBe(true)
  })
})
