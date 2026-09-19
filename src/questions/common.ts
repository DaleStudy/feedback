import type { QuestionConfig, QuestionType } from '@/db/schema'

// 모든 프로그램(스터디·프로젝트)이 같은 key 로 묻는 문항. 기수·프로그램 간 비교는 이 key 로 한다.
// label 의 {이름} 은 seed 의 vars 로 채운다. 문구를 고치면 이전 기수와 비교가 깨지므로 신중히.
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
}

export const commonQuestions: readonly CommonQuestion[] = [
  { key: 'goal_achieved', type: 'scale', label: '시작할 때 이 {program}에서 하고 싶었던 것을 얼마나 해냈나요?' },
  { key: 'effort_satisfied', type: 'scale', label: '{activity} 들인 노력에 스스로 만족하나요?' },
  {
    key: 'gave_back',
    type: 'scale',
    label: '다른 참가자의 {artifact}을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요?',
    config: { minLabel: '거의 안 했다', maxLabel: '적극적으로 했다' },
  },
  { key: 'highlight_lowlight', type: 'long', label: '{period} 잘한 것 하나와 아쉬운 것 하나를 적어주세요.' },
  { key: 'do_differently', type: 'long', label: '{redo} 무엇을 다르게 하시겠어요?' },
  { key: 'community_help', type: 'long', label: '그렇게 하는 데 커뮤니티(운영진이나 다른 참가자)가 어떤 도움을 주면 좋을까요?' },
  { key: 'rejoin', type: 'choice', label: '{next} 참여할 생각이 있나요?', config: { options: ['있다', '조건이 맞으면 있다', '없다'] } },
  { key: 'dropout', type: 'long', label: '중간에 그만두셨다면, 그때 무엇이 달랐다면 계속할 수 있었을까요?', required: false },
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
