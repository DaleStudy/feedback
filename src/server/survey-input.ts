import { nanoid } from 'nanoid'
import { type QuestionConfig, type QuestionType, questionTypes } from '@/db/schema'
import { type CommonVars, commonQuestions, renderLabel } from '@/questions/common'
import { validateConfig } from '@/questions/registry'

// 편집 UI 와 seed 가 보내는 설문·문항 입력을 DB 행으로 바꾸고 검사하는 순수 함수.
// 서버 함수(functions/manage.ts)는 권한과 잠금만 보고 나머지는 여기에 맡긴다.

// 새 설문의 id (nanoid 8자)
export const newSurveyId = () => nanoid(8)

// GitHub login: 영문·숫자·가운데 하이픈, 39자까지
export function isValidLogin(value: string) {
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(value)
}

export interface SurveyFields {
  title: string
  description: string | null
  listed: boolean
  closesAt: string | null
  vars: CommonVars | null
}

const VAR_NAMES: ReadonlyArray<keyof CommonVars> = ['program', 'period', 'activity', 'artifact', 'redo', 'next']

export function normalizeSurveyFields(input: SurveyFields): SurveyFields {
  const title = input.title.trim()
  if (!title) throw new Error('제목을 적어주세요')
  if (input.closesAt !== null && Number.isNaN(Date.parse(input.closesAt))) throw new Error('마감 시각이 잘못됐습니다')
  return {
    title,
    description: input.description?.trim() || null,
    listed: input.listed,
    closesAt: input.closesAt,
    vars: normalizeVars(input.vars),
  }
}

// 전부 비어 있으면 null, 하나라도 있으면 여섯 개가 모두 있어야 한다. 공통 문항을 넣을 때 빠진 값이 있으면 문구에 구멍이 난다.
function normalizeVars(vars: CommonVars | null): CommonVars | null {
  if (!vars) return null
  const trimmed = Object.fromEntries(VAR_NAMES.map((k) => [k, (vars[k] ?? '').trim()])) as unknown as CommonVars
  const filled = VAR_NAMES.filter((k) => trimmed[k])
  if (filled.length === 0) return null
  if (filled.length < VAR_NAMES.length) {
    throw new Error(`공통 문항 변수가 비어 있습니다: ${VAR_NAMES.filter((k) => !trimmed[k]).join(', ')}`)
  }
  return trimmed
}

// 문항 입력. 공통 문항은 key 만 보내고 문구·유형은 서버가 정한다 (클라이언트 문구는 무시 → 기수 간 비교 보존).
export type QuestionInput =
  | { key: string; required?: boolean }
  | { key?: undefined; type: QuestionType; label: string; required?: boolean; config?: QuestionConfig | null }

export interface QuestionRow {
  position: number
  key: string | null
  type: QuestionType
  label: string
  required: boolean
  identified: boolean
  config: QuestionConfig | null
}

export function resolveQuestions(items: QuestionInput[], vars: CommonVars | null): QuestionRow[] {
  if (items.length === 0) throw new Error('문항이 하나 이상 있어야 합니다')
  const seen = new Set<string>()
  return items.map((item, i) => {
    const position = i + 1
    if (item.key !== undefined) {
      const base = commonQuestions.find((c) => c.key === item.key)
      if (!base) throw new Error(`공통 문항이 없습니다: ${item.key}`)
      if (seen.has(base.key)) throw new Error(`공통 문항이 겹칩니다: ${base.key}`)
      seen.add(base.key)
      if (!vars) throw new Error('공통 문항을 넣으려면 변수(vars)를 먼저 채워주세요')
      return {
        position,
        key: base.key,
        type: base.type,
        label: renderLabel(base.label, vars),
        required: item.required ?? base.required ?? true,
        identified: base.identified ?? false,
        config: base.config ?? null,
      }
    }
    if (!questionTypes.includes(item.type)) throw new Error(`문항 유형이 잘못됐습니다: ${item.type}`)
    const label = item.label.trim()
    if (!label) throw new Error(`${position}번 문항의 문구를 적어주세요`)
    const config = item.config ?? null
    const problem = validateConfig({ type: item.type, config })
    if (problem) throw new Error(`${position}번 문항: ${problem}`)
    return { position, key: null, type: item.type, label, required: item.required ?? true, identified: false, config }
  })
}
