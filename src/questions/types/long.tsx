import { Textarea } from '@/components/Textarea'
import type { QuestionTypeDef } from '../definition'
import { TextList } from '../TextList'

export const long: QuestionTypeDef<Record<never, never>> = {
  name: '서술',
  answerSeconds: 40,
  autoAdvance: false,
  hint: '⌘/Ctrl + Enter 로 다음',
  defaultConfig: {},
  validateConfig: () => null,
  validate: () => null,
  Input: ({ labelledBy, value, onChange, onSubmit }) => (
    <Textarea
      labelledBy={labelledBy}
      value={value}
      onChange={onChange}
      rows={5}
      size="lg"
      placeholder="여기에 적어 주세요"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
          e.preventDefault()
          onSubmit()
        }
      }}
    />
  ),
  resultSection: 'answers',
  Result: ({ values }) => <TextList values={values} />,
  ConfigEditor: () => null,
}
