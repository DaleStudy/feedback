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

// seed 에서 넘어온 config 를 유형 기본값 위에 얹는다
export function resolveConfig(q: Pick<QuestionRow, 'type' | 'config'>) {
  return { ...registry[q.type].defaultConfig, ...(q.config ?? {}) }
}

export function validateAnswer(q: Pick<QuestionRow, 'type' | 'config'>, value: string) {
  return registry[q.type].validate(value, resolveConfig(q))
}

export function QuestionInput({ question, value, onChange }: { question: QuestionRow; value: string; onChange: (value: string) => void }) {
  const { Input } = registry[question.type]
  return (
    <Input
      id={question.id}
      label={question.label}
      required={question.required}
      config={resolveConfig(question)}
      value={value}
      onChange={onChange}
    />
  )
}

export function QuestionResult({ question, values }: { question: Pick<QuestionRow, 'type' | 'config'>; values: string[] }) {
  const { Result } = registry[question.type]
  return <Result config={resolveConfig(question)} values={values} />
}
