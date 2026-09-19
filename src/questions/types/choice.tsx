import { RadioGroup } from 'daleui'
import type { QuestionTypeDef } from '../definition'
import { Distribution } from '../Distribution'

export interface ChoiceConfig {
  options: string[]
}

export const choice: QuestionTypeDef<ChoiceConfig> = {
  defaultConfig: { options: [] },

  validate: (value, config) => (config.options.includes(value) ? null : '보기에 없는 값입니다'),

  Input: ({ id, label, required, config, value, onChange }) => (
    <RadioGroup name={`q${id}`} label={label} required={required} value={value} onChange={onChange}>
      {config.options.map((opt) => (
        <RadioGroup.Item key={opt} value={opt}>
          {opt}
        </RadioGroup.Item>
      ))}
    </RadioGroup>
  ),

  Result: ({ config, values }) => <Distribution values={values} options={config.options} />,
}
