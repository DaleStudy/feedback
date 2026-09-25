import { describe, expect, test } from 'bun:test'
import type { CommonVars } from '@/questions/common'
import { isValidLogin, newSurveyId, normalizeSurveyFields, parseInvitee, resolveQuestions } from './survey-input'

const vars: CommonVars = {
  program: '스터디',
  period: '이번 기수에서',
  activity: '매주 글을 쓰는 데',
  artifact: '글',
  redo: '같은 스터디를 다시 한다면',
  next: '다음 기수에 다시',
}

describe('newSurveyId', () => {
  test('URL 에 쓸 수 있는 글자로 8자', () => {
    const ids = Array.from({ length: 200 }, () => newSurveyId())
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('isValidLogin', () => {
  test('GitHub login 규칙', () => {
    expect(isValidLogin('DaleSeo')).toBe(true)
    expect(isValidLogin('lms0806')).toBe(true)
    expect(isValidLogin('a-b')).toBe(true)
    expect(isValidLogin('-ab')).toBe(false)
    expect(isValidLogin('a--b')).toBe(false)
    expect(isValidLogin('@DaleSeo')).toBe(false)
    expect(isValidLogin('x'.repeat(40))).toBe(false)
  })
})

describe('parseInvitee', () => {
  test('@login 은 개인, team:slug 는 팀', () => {
    expect(parseInvitee(' @DaleSeo ')).toEqual({ kind: 'user', name: 'DaleSeo' })
    expect(parseInvitee('team:Maintainer')).toEqual({ kind: 'team', name: 'maintainer' })
  })

  test('형식이 틀리면 실패한다', () => {
    expect(() => parseInvitee('team:')).toThrow('팀')
    expect(() => parseInvitee('두 단어')).toThrow('아이디')
  })
})

describe('normalizeSurveyFields', () => {
  const base = { title: ' 회고 ', description: '  ', visibility: 'home' as const, closesAt: null, vars: null }

  test('공백을 정리하고 빈 설명은 null 로', () => {
    expect(normalizeSurveyFields(base)).toEqual({ ...base, title: '회고', description: null })
  })

  test('제목이 비면 실패한다', () => {
    expect(() => normalizeSurveyFields({ ...base, title: ' ' })).toThrow('제목')
  })

  test('마감 시각은 파싱 가능해야 한다', () => {
    expect(() => normalizeSurveyFields({ ...base, closesAt: '내일' })).toThrow('마감')
    expect(normalizeSurveyFields({ ...base, closesAt: '2026-09-30T14:59:59.000Z' }).closesAt).toBe('2026-09-30T14:59:59.000Z')
  })

  test('vars 는 전부 비면 null, 일부만 비면 실패', () => {
    const empty = { program: '', period: '', activity: '', artifact: '', redo: '', next: '' }
    expect(normalizeSurveyFields({ ...base, vars: empty }).vars).toBeNull()
    expect(() => normalizeSurveyFields({ ...base, vars: { ...vars, artifact: ' ' } })).toThrow('artifact')
    expect(normalizeSurveyFields({ ...base, vars: { ...vars, artifact: ' 글 ' } }).vars).toEqual(vars)
  })
})

describe('resolveQuestions', () => {
  test('공통 문항은 key 로 찾아 서버가 문구를 렌더링한다', () => {
    const [q] = resolveQuestions([{ key: 'gave_back' }], vars)
    expect(q).toEqual({
      position: 1,
      key: 'gave_back',
      type: 'scale',
      label: '다른 참가자의 글을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요?',
      required: true,
      identified: false,
      config: { minLabel: '거의 안 했다', maxLabel: '적극적으로 했다' },
    })
  })

  test('실명 공통 문항은 identified 가 켜진다', () => {
    const [q] = resolveQuestions([{ key: 'join_organizers' }], vars)
    expect(q.identified).toBe(true)
  })

  test('공통 문항의 required 는 덮어쓸 수 있고 기본값은 정의를 따른다', () => {
    const [feedback, help] = resolveQuestions([{ key: 'survey_feedback' }, { key: 'community_help', required: false }], vars)
    expect(feedback.required).toBe(false)
    expect(help.required).toBe(false)
  })

  test('vars 없이 공통 문항을 넣으면 실패한다', () => {
    expect(() => resolveQuestions([{ key: 'goal_achieved' }], null)).toThrow('vars')
  })

  test('없는 key, 겹치는 key 는 실패한다', () => {
    expect(() => resolveQuestions([{ key: 'nope' }], vars)).toThrow('nope')
    expect(() => resolveQuestions([{ key: 'rejoin' }, { key: 'rejoin' }], vars)).toThrow('겹칩니다')
  })

  test('직접 문항은 유형·문구·config 를 검사하고 position 을 매긴다', () => {
    const rows = resolveQuestions(
      [
        { type: 'long', label: ' 하고 싶은 말 ', required: false },
        { type: 'choice', label: '가장 도움이 된 것', config: { options: ['마감', '리뷰'] } },
      ],
      null,
    )
    expect(rows.map((r) => [r.position, r.key, r.label, r.required])).toEqual([
      [1, null, '하고 싶은 말', false],
      [2, null, '가장 도움이 된 것', true],
    ])
  })

  test('직접 문항의 오류는 몇 번 문항인지 알려준다', () => {
    expect(() => resolveQuestions([{ type: 'short', label: ' ' }], null)).toThrow('1번')
    expect(() => resolveQuestions([{ key: 'rejoin' }, { type: 'choice', label: '?', config: { options: ['하나'] } }], vars)).toThrow(
      '2번 문항: 보기를 두 개 이상',
    )
    expect(() => resolveQuestions([], null)).toThrow('하나 이상')
  })
})
