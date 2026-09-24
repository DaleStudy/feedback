import { TextInput } from 'daleui'
import type { QuestionTypeDef } from '../definition'
import { TextList } from '../TextList'

export const short: QuestionTypeDef<Record<never, never>> = {
  name: '단답',
  answerSeconds: 20,
  autoAdvance: false,
  hint: 'Enter 로 다음',
  defaultConfig: {},
  validateConfig: () => null,
  validate: () => null,
  Input: ({ labelledBy, value, onChange, onSubmit }) => (
    <div className="max-w-[560px]">
      <TextInput
        aria-labelledby={labelledBy}
        value={value}
        placeholder="여기에 적어 주세요"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
    </div>
  ),
  resultSection: 'answers',
  Result: ({ values }) => <TextList values={values} />,
  ConfigEditor: () => null,
}
