import { Button, HStack, Text, TextInput } from 'daleui'
import type { QuestionTypeDef } from '../definition'
import { ScaleDistribution } from '../Distribution'

export interface ScaleConfig {
  min: number
  max: number
  minLabel: string
  maxLabel: string
}

function steps(config: ScaleConfig) {
  return Array.from({ length: config.max - config.min + 1 }, (_, i) => String(config.min + i))
}

export const scale: QuestionTypeDef<ScaleConfig> = {
  name: '척도',
  answerSeconds: 15,
  autoAdvance: true,
  hint: '고르면 바로 다음 질문으로 넘어가요',
  defaultConfig: { min: 1, max: 5, minLabel: '전혀 아니다', maxLabel: '매우 그렇다' },

  validateConfig: (config) => {
    if (!Number.isInteger(config.min) || !Number.isInteger(config.max)) return '최소·최대는 정수여야 합니다'
    if (config.min >= config.max) return '최소는 최대보다 작아야 합니다'
    if (config.max - config.min > 10) return '척도는 11단계까지입니다'
    return null
  },

  validate: (value, config) => {
    const n = Number(value)
    return Number.isInteger(n) && n >= config.min && n <= config.max ? null : `${config.min}~${config.max} 사이 값이어야 합니다`
  },

  Input: ({ labelledBy, config, value, onChange }) => (
    <div className="flex max-w-[560px] flex-col gap-3">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${steps(config).length}, minmax(0, 1fr))` }}
      >
        {steps(config).map((n) => (
          <Button
            key={n}
            role="radio"
            aria-checked={value === n}
            variant={value === n ? 'solid' : 'outline'}
            tone={value === n ? 'brand' : 'neutral'}
            size="lg"
            fullWidth
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ))}
      </div>
      <div className="flex justify-between gap-4">
        <Text size="sm" tone="neutral">
          {config.min} · {config.minLabel}
        </Text>
        <Text size="sm" tone="neutral">
          {config.max} · {config.maxLabel}
        </Text>
      </div>
    </div>
  ),

  resultSection: 'numbers',
  Result: ({ config, values }) => (
    <ScaleDistribution values={values} steps={steps(config)} minLabel={config.minLabel} maxLabel={config.maxLabel} />
  ),

  ConfigEditor: ({ config, onChange }) => (
    <HStack gap="12" align="bottom" className="flex-wrap">
      <TextInput
        label="최소"
        type="number"
        value={String(config.min)}
        onChange={(e) => onChange({ ...config, min: Number(e.target.value) })}
        className="w-20"
      />
      <TextInput
        label="최소 라벨"
        value={config.minLabel}
        onChange={(e) => onChange({ ...config, minLabel: e.target.value })}
      />
      <TextInput
        label="최대"
        type="number"
        value={String(config.max)}
        onChange={(e) => onChange({ ...config, max: Number(e.target.value) })}
        className="w-20"
      />
      <TextInput
        label="최대 라벨"
        value={config.maxLabel}
        onChange={(e) => onChange({ ...config, maxLabel: e.target.value })}
      />
    </HStack>
  ),
}
