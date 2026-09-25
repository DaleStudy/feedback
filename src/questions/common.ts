import type { QuestionConfig, QuestionType } from '@/db/schema'

// 공통 문항이 기본으로 들어가는 회고: 참여 회고(참가자가 답함) · 운영 회고(운영진이 답함)
export type Audience = 'participants' | 'organizers'

// 모든 프로그램(스터디·프로젝트)이 같은 key 로 묻는 문항. 기수·프로그램 간 비교는 이 key 로 한다.
// label 의 {이름} 은 설문의 vars 로 채운다 (surveys.vars). 문구를 고치면 이전 기수와 비교가 깨지므로 신중히.
export interface CommonVars {
  program: string // '스터디' | '프로젝트'
  period: string // '이번 기수에서' | '지난 반년 동안'
  activity: string // '매주 글을 쓰는 데' | '컴포넌트를 만들고 리뷰하는 데'
  artifact: string // '글' | '풀이' | '작업'. 뒤에 을/를이 붙으므로 한글로 끝나야 한다
  redo: string // '같은 스터디를 다시 한다면' | '앞으로 계속 참여한다면'
  next: string // '다음 기수에 다시' | '앞으로도 계속'
}

export interface CommonQuestion {
  key: string
  type: QuestionType
  label: string
  required?: boolean
  config?: QuestionConfig
  // 어느 회고의 기본 문항인가. 없으면 양쪽
  audience?: Audience
  // 결과 화면에서 이 답에만 응답자 아이디를 보여 준다 (questions.identified)
  identified?: boolean
}

export const commonQuestions: readonly CommonQuestion[] = [
  // 참가자 설문. 자기 활동을 먼저 돌아보고(잘한 것 → 아쉬웠던 것), 다시 한다면 어떻게 할지, 그걸 위해 커뮤니티가 도울 것 순서다.
  { key: 'goal_achieved', audience: 'participants', type: 'scale', label: '시작할 때 이 {program}에서 하고 싶었던 것을 얼마나 해냈나요?' },
  { key: 'effort_satisfied', audience: 'participants', type: 'scale', label: '{activity} 들인 노력에 스스로 만족하나요?' },
  {
    key: 'gave_back',
    audience: 'participants',
    type: 'scale',
    label: '다른 참가자의 {artifact}을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요?',
    config: { minLabel: '거의 안 했다', maxLabel: '적극적으로 했다' },
  },
  { key: 'highlight', audience: 'participants', type: 'long', label: '{period} 내가 잘한 것 하나를 적어주세요.' },
  { key: 'lowlight', audience: 'participants', type: 'long', label: '{period} 나 스스로 아쉬웠던 것 하나를 적어주세요.' },
  { key: 'do_differently', audience: 'participants', type: 'long', label: '{redo} 무엇을 다르게 하시겠어요?' },
  { key: 'community_help', audience: 'participants', type: 'long', label: '그렇게 하는 데 운영진이나 다른 참가자가 어떤 도움을 주면 좋을까요?' },
  {
    key: 'recommend',
    audience: 'participants',
    type: 'scale',
    label: '이 {program}를 주변 개발자에게 추천하시겠어요?',
    config: { minLabel: '전혀 아니다', maxLabel: '꼭 추천하겠다' },
  },
  // 조건은 lowlight·do_differently·community_help 가 서술형으로 받으므로 보기로 다시 묻지 않는다 (organizer_continue 와 같다)
  { key: 'rejoin', audience: 'participants', type: 'choice', label: '{next} 참여할 생각이 있나요?', config: { options: ['있다', '없다'] } },
  // 차기 운영진 모집. 관심 있는 사람만 Discord 사용자명을 남긴다. 연락해야 하므로 이 문항만 실명이다.
  {
    key: 'join_organizers',
    audience: 'participants',
    type: 'short',
    label: '다르게 해보고 싶은 것이 있었다면, 운영진이 되어 직접 바꿔 보는 건 어때요? 관심 있다면 연락받을 Discord 사용자명을 남겨 주세요.',
    required: false,
    identified: true,
  },

  // 운영진(리더·코치) 설문. 뼈대는 같고 관점만 운영자다. 100% 자발적 운영이라 운영진 소진(organizer_sustainable)이 핵심 신호다.
  { key: 'organizer_goal_achieved', audience: 'organizers', type: 'scale', label: '시작할 때 운영자로서 하고 싶었던 것을 얼마나 해냈나요?' },
  { key: 'organizer_sustainable', audience: 'organizers', type: 'scale', label: '운영에 들인 시간과 에너지는 다음에도 이어갈 수 있는 수준이었나요?' },
  {
    key: 'organizer_presence',
    audience: 'organizers',
    type: 'scale',
    label: '참가자의 질문과 {artifact}에 반응하는 데 얼마나 시간을 쓸 수 있었나요?',
    config: { minLabel: '거의 못 썼다', maxLabel: '충분히 썼다' },
  },
  { key: 'organizer_highlight', audience: 'organizers', type: 'long', label: '{period} 운영자로서 잘한 것 하나를 적어주세요.' },
  { key: 'organizer_lowlight', audience: 'organizers', type: 'long', label: '{period} 운영자로서 아쉬웠던 것 하나를 적어주세요.' },
  { key: 'organizer_do_differently', audience: 'organizers', type: 'long', label: '{redo} 운영 방식에서 무엇을 다르게 하시겠어요?' },
  { key: 'organizer_help', audience: 'organizers', type: 'long', label: '그렇게 하는 데 커뮤니티 차원에서 다른 운영진이 어떤 도움을 주면 좋을까요?' },
  { key: 'organizer_automate', audience: 'organizers', type: 'long', label: '반복 작업 중 자동화하거나 아예 없애고 싶은 것이 있다면 적어주세요.', required: false },
  { key: 'organizer_continue', audience: 'organizers', type: 'choice', label: '{next} 운영을 맡을 생각이 있나요?', config: { options: ['있다', '없다'] } },

  // 양쪽 맨 끝. 첫 기수부터 문항 자체가 잘 작동했는지 듣는다.
  { key: 'survey_feedback', type: 'long', label: '헷갈렸던 문항이나 다음 설문에서 더 물어봤으면 하는 게 있었다면 알려주세요.', required: false },
]

// 자리표시자 바로 뒤의 조사는 앞말의 받침에 맞춰 고른다: {artifact}을 → 글을 / 풀이를
const PARTICLES: Record<string, [withFinal: string, withoutFinal: string]> = {
  을: ['을', '를'], 를: ['을', '를'],
  이: ['이', '가'], 가: ['이', '가'],
  은: ['은', '는'], 는: ['은', '는'],
  과: ['과', '와'], 와: ['과', '와'],
}

function particleAfter(word: string, written: string) {
  const [withFinal, withoutFinal] = PARTICLES[written]
  const code = word.charCodeAt(word.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return `${withFinal}(${withoutFinal})` // 한글로 끝나지 않으면 판단 불가
  return (code - 0xac00) % 28 === 0 ? withoutFinal : withFinal
}

export function renderLabel(label: string, vars: CommonVars) {
  return label.replace(/\{(\w+)\}([을를이가은는과와])?/g, (_, name: string, particle?: string) => {
    if (!(name in vars)) throw new Error(`공통 문항의 {${name}} 에 해당하는 vars 값이 없습니다`)
    const value = vars[name as keyof CommonVars]
    return particle ? value + particleAfter(value, particle) : value
  })
}

// 설문 대상의 기본 문항 (양쪽 문항 포함)
export function commonQuestionsFor(audience: Audience) {
  return commonQuestions.filter((q) => q.audience === undefined || q.audience === audience)
}
