import { useState } from 'react'
import { Button } from 'daleui'
import { Textarea } from '@/components/Textarea'
import type { QuestionTypeDef } from '../definition'
import { ChoiceDistribution } from '../Distribution'

export interface ChoiceConfig {
  options: string[]
}

export const choice: QuestionTypeDef<ChoiceConfig> = {
  name: '선택',
  answerSeconds: 15,
  autoAdvance: true,
  hint: '고르면 바로 다음 질문으로 넘어가요',
  defaultConfig: { options: [] },

  validateConfig: (config) => {
    const options = config.options.map((o) => o.trim())
    if (options.length < 2 || options.some((o) => !o)) return '보기를 두 개 이상 적어주세요'
    if (new Set(options).size !== options.length) return '보기가 겹칩니다'
    return null
  },

  validate: (value, config) => (config.options.includes(value) ? null : '보기에 없는 값입니다'),

  Input: ({ labelledBy, config, value, onChange }) => (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex max-w-[440px] flex-col gap-2">
      {config.options.map((opt) => (
        <Button
          key={opt}
          role="radio"
          aria-checked={value === opt}
          variant={value === opt ? 'solid' : 'outline'}
          tone={value === opt ? 'brand' : 'neutral'}
          size="lg"
          fullWidth
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </div>
  ),

  resultSection: 'numbers',
  Result: ({ config, values }) => <ChoiceDistribution values={values} options={config.options} />,

  // 보기는 한 줄에 하나. 입력 중인 원문은 여기서만 들고, 밖으로는 빈 줄과 앞뒤 공백을 걷어낸 보기만 내보낸다.
  ConfigEditor: ({ config, onChange }) => {
    const [text, setText] = useState(config.options.join('\n'))
    return (
      <Textarea
        label="보기 (한 줄에 하나)"
        rows={Math.max(3, config.options.length + 1)}
        value={text}
        onChange={(next) => {
          setText(next)
          onChange({ options: next.split('\n').map((o) => o.trim()).filter(Boolean) })
        }}
      />
    )
  },
}
