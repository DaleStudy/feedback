import { Textarea } from '@/components/Textarea'
import type { QuestionTypeDef } from '../definition'
import { TextList } from '../TextList'

export const long: QuestionTypeDef<Record<never, never>> = {
  defaultConfig: {},
  validate: () => null,
  Input: ({ label, required, value, onChange }) => (
    <Textarea label={label} required={required} value={value} onChange={onChange} />
  ),
  Result: ({ values }) => <TextList values={values} />,
}
