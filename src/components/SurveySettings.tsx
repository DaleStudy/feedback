import { Heading, RadioGroup, Text, TextInput } from 'daleui'
import { closesAtToKstDate, kstDateToClosesAt } from '@/lib/kst'
import type { CommonVars } from '@/questions/common'
import { type Visibility, visibilities } from '@/db/schema'
import { VISIBILITY } from '@/lib/visibility'
import type { SurveyFields } from '@/server/survey-input'
import { Textarea } from './Textarea'

// 폼은 vars 를 항상 여섯 칸 문자열로 들고, 서버(normalizeSurveyFields)가 전부 비면 null 로 바꾼다.
export type SurveyFormValues = Omit<SurveyFields, 'vars'> & { vars: CommonVars }

export const emptyVars: CommonVars = { program: '', period: '', activity: '', artifact: '', redo: '', next: '' }

const VAR_FIELDS: Array<{ name: keyof CommonVars; placeholder: string }> = [
  { name: 'program', placeholder: '스터디 / 프로젝트' },
  { name: 'period', placeholder: '이번 기수에서 / 지난 반년 동안' },
  { name: 'activity', placeholder: '매주 글을 쓰는 데' },
  { name: 'artifact', placeholder: '글 / 풀이 / 작업' },
  { name: 'redo', placeholder: '같은 스터디를 다시 한다면' },
  { name: 'next', placeholder: '다음 기수에 다시' },
]

interface Props {
  value: SurveyFormValues
  onChange: (value: SurveyFormValues) => void
  // 응답이 있으면 공통 문항 변수는 바꿀 수 없다 (server/functions/manage.ts)
  locked: boolean
}

export function SurveySettings({ value, onChange, locked }: Props) {
  const set = <K extends keyof SurveyFormValues>(key: K, v: SurveyFormValues[K]) => onChange({ ...value, [key]: v })

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <Heading level={2} size={5}>
          기본 정보
        </Heading>
        <TextInput label="제목" required value={value.title} onChange={(e) => set('title', e.target.value)} />
        <Textarea
          label="설명"
          rows={4}
          value={value.description ?? ''}
          onChange={(v) => set('description', v)}
          placeholder="응답자가 시작 화면에서 읽는 안내예요. 왜 묻는지 적어 주세요."
        />
        <div className="w-60">
          <TextInput
            label="마감일"
            type="date"
            value={closesAtToKstDate(value.closesAt)}
            onChange={(e) => set('closesAt', kstDateToClosesAt(e.target.value))}
            helperText="그날 23:59 (한국 시간)에 마감돼요. 비우면 계속 열려 있어요. 지금 끝내려면 설문 관리에서 마감하세요"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={2} size={5}>
          공개 범위
        </Heading>
        <RadioGroup name="visibility" label="누가 보고 답할까요" value={value.visibility} onChange={(v) => set('visibility', v as Visibility)}>
          {visibilities.map((v) => (
            <RadioGroup.Item key={v} value={v}>
              {VISIBILITY[v].label} — {VISIBILITY[v].detail}
            </RadioGroup.Item>
          ))}
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={2} size={5}>
            공통 문항 변수
          </Heading>
          <Text size="sm" tone="neutral">
            공통 문항 문구의 {'{program}'}, {'{activity}'} 같은 자리를 채워요. 공통 문항을 넣으려면 여섯 칸을 모두 채워야 해요.
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {VAR_FIELDS.map((f) => (
            <TextInput
              key={f.name}
              label={f.name}
              placeholder={f.placeholder}
              value={value.vars[f.name]}
              disabled={locked}
              onChange={(e) => set('vars', { ...value.vars, [f.name]: e.target.value })}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
