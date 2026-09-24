import type { QuestionConfig, QuestionType } from '@/db/schema'
import type { QuestionTypeDef } from './definition'
import { choice } from './types/choice'
import { long } from './types/long'
import { scale } from './types/scale'
import { short } from './types/short'

// schema.ts 의 questionTypes 와 1:1. 빠지거나 남는 유형이 있으면 타입 오류가 난다.
const registry: { [T in QuestionType]: QuestionTypeDef<object> } = { scale, short, long, choice }

interface QuestionRow {
  id: number
  type: QuestionType
  label: string
  required: boolean
  config: QuestionConfig | null
}

export function questionTypeName(type: QuestionType) {
  return registry[type].name
}

// 응답 화면이 유형에 따라 달리 움직이는 부분. 페이지에서 유형별로 분기하지 않도록 여기서 꺼내 쓴다.
export function questionBehavior(type: QuestionType) {
  const { autoAdvance, hint } = registry[type]
  return { autoAdvance, hint }
}

export function resultSection(type: QuestionType) {
  return registry[type].resultSection
}

// 문항 유형별 예상 시간을 더해 분 단위로 올린다. 최소 1분.
export function estimateMinutes(types: readonly QuestionType[]) {
  const seconds = types.reduce((sum, t) => sum + registry[t].answerSeconds, 0)
  return Math.max(1, Math.round(seconds / 60))
}

// 저장된 config 를 유형 기본값 위에 얹는다
export function resolveConfig(q: Pick<QuestionRow, 'type' | 'config'>) {
  return { ...registry[q.type].defaultConfig, ...(q.config ?? {}) }
}

export function validateAnswer(q: Pick<QuestionRow, 'type' | 'config'>, value: string) {
  return registry[q.type].validate(value, resolveConfig(q))
}

// 편집 UI 가 저장하려는 config 검사. 기본값을 얹은 뒤 검사하므로 일부만 넘어와도 된다.
export function validateConfig(q: Pick<QuestionRow, 'type' | 'config'>) {
  return registry[q.type].validateConfig(resolveConfig(q))
}

export function QuestionInput({
  question,
  labelledBy,
  value,
  onChange,
  onSubmit,
}: {
  question: Pick<QuestionRow, 'id' | 'type' | 'config'>
  labelledBy: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const { Input } = registry[question.type]
  return (
    <Input
      id={question.id}
      labelledBy={labelledBy}
      config={resolveConfig(question)}
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  )
}

export function QuestionResult({ question, values }: { question: Pick<QuestionRow, 'type' | 'config'>; values: string[] }) {
  const { Result } = registry[question.type]
  return <Result config={resolveConfig(question)} values={values} />
}

export function QuestionConfigEditor({
  question,
  onChange,
}: {
  question: Pick<QuestionRow, 'type' | 'config'>
  onChange: (config: QuestionConfig) => void
}) {
  const { ConfigEditor } = registry[question.type]
  return <ConfigEditor config={resolveConfig(question)} onChange={(config) => onChange(config as QuestionConfig)} />
}
