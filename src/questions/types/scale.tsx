import { RadioGroup } from 'daleui'
import type { QuestionTypeDef } from '../definition'
import { Distribution } from '../Distribution'

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
  defaultConfig: { min: 1, max: 5, minLabel: '전혀 아니다', maxLabel: '매우 그렇다' },

  validate: (value, config) => {
    const n = Number(value)
    return Number.isInteger(n) && n >= config.min && n <= config.max ? null : `${config.min}~${config.max} 사이 값이어야 합니다`
  },

  Input: ({ id, label, required, config, value, onChange }) => (
    <RadioGroup
      name={`q${id}`}
      label={label}
      orientation="horizontal"
      required={required}
      hint={`${config.min} = ${config.minLabel} · ${config.max} = ${config.maxLabel}`}
      value={value}
      onChange={onChange}
    >
      {steps(config).map((n) => (
        <RadioGroup.Item key={n} value={n}>
          {n}
        </RadioGroup.Item>
      ))}
    </RadioGroup>
  ),

  Result: ({ config, values }) => <Distribution values={values} options={steps(config)} showAverage />,
}
