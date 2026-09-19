import { TextInput } from 'daleui'
import type { QuestionTypeDef } from '../definition'
import { TextList } from '../TextList'

export const short: QuestionTypeDef<Record<never, never>> = {
  defaultConfig: {},
  validate: () => null,
  Input: ({ label, required, value, onChange }) => (
    <TextInput label={label} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  Result: ({ values }) => <TextList values={values} />,
}
