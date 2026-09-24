import { useState } from 'react'
import { Button, Checkbox, Heading, Select, Tag, Text, TextInput } from 'daleui'
import { type QuestionConfig, type QuestionType, questionTypes } from '@/db/schema'
import { type Audience, type CommonVars, commonQuestions, commonQuestionsFor, renderLabel } from '@/questions/common'
import { QuestionConfigEditor, QuestionInput, questionTypeName } from '@/questions/registry'
import type { QuestionInput as QuestionItem } from '@/server/survey-input'

// 편집 중인 문항. uid 는 React key 와 미리보기 id 용이고 저장할 때 벗겨낸다.
export type BuilderItem = QuestionItem & { uid: number }

let nextUid = 1
export const withUid = (q: QuestionItem): BuilderItem => ({ ...q, uid: nextUid++ })

interface Props {
  items: BuilderItem[]
  onChange: (items: BuilderItem[]) => void
  vars: CommonVars
  locked: boolean
}

const PRESETS: Array<{ audience: Audience; label: string }> = [
  { audience: 'participants', label: '참여 회고 기본 문항 넣기' },
  { audience: 'organizers', label: '운영 회고 기본 문항 넣기' },
]

// Typeform 빌더처럼 왼쪽 목록 · 가운데 편집 · 오른쪽 응답 화면 미리보기
export function SurveyBuilder({ items, onChange, vars, locked }: Props) {
  const [selected, setSelected] = useState(0)
  const index = Math.min(selected, items.length - 1)
  const item = items[index]
  const varsComplete = Object.values(vars).every((v) => v.trim())

  const view = (q: BuilderItem) => {
    if (q.key !== undefined) {
      const base = commonQuestions.find((c) => c.key === q.key)
      return {
        type: base?.type ?? ('long' as QuestionType),
        label: base ? (varsComplete ? renderLabel(base.label, vars) : base.label) : `알 수 없는 공통 문항: ${q.key}`,
        config: (base?.config ?? null) as QuestionConfig | null,
        required: q.required ?? base?.required ?? true,
      }
    }
    return { type: q.type, label: q.label, config: q.config ?? null, required: q.required ?? true }
  }

  const replace = (patch: Partial<BuilderItem>) => onChange(items.map((q, i) => (i === index ? ({ ...q, ...patch } as BuilderItem) : q)))
  const move = (delta: number) => {
    const next = [...items]
    const [q] = next.splice(index, 1)
    next.splice(index + delta, 0, q)
    onChange(next)
    setSelected(index + delta)
  }
  const usedKeys = new Set(items.flatMap((q) => (q.key !== undefined ? [q.key] : [])))
  const addCommon = (keys: string[]) => {
    const added = keys
      .filter((k) => !usedKeys.has(k))
      .map((key) => withUid({ key, required: commonQuestions.find((c) => c.key === key)?.required ?? true }))
    if (added.length === 0) return
    onChange([...items, ...added])
    setSelected(items.length)
  }
  const addCustom = () => {
    onChange([...items, withUid({ type: 'long', label: '', required: true, config: null })])
    setSelected(items.length)
  }

  return (
    <div className="flex min-h-0 grow">
      <aside aria-label="문항 목록" className="flex w-[340px] shrink-0 flex-col border-r border-[var(--colors-border-neutral)] bg-[var(--colors-bg-neutral-hover)]">
        <ol className="flex grow flex-col gap-1 overflow-auto p-3">
          {items.map((q, i) => {
            const v = view(q)
            return (
              <li key={q.uid}>
                <button
                  type="button"
                  aria-current={i === index}
                  onClick={() => setSelected(i)}
                  className={`flex w-full cursor-pointer gap-3 rounded-[var(--radii-md)] border p-3 text-left ${
                    i === index ? 'border-[var(--colors-border-brand)] bg-[var(--colors-app-bg)]' : 'border-transparent bg-transparent'
                  }`}
                >
                  <span className="min-w-5 text-[13px] font-bold text-[var(--colors-fg-brand)]">{i + 1}</span>
                  <span className="flex min-w-0 flex-col gap-0.5 text-[var(--colors-fg-neutral)]">
                    <span className="text-xs">
                      {questionTypeName(v.type)}
                      {q.key !== undefined && ' · 공통'}
                      {!v.required && ' · 선택'}
                    </span>
                    <span className="line-clamp-2 text-sm leading-snug">{v.label || '(문구를 적어 주세요)'}</span>
                  </span>
                </button>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="p-3">
              <Text size="sm" tone="neutral">
                아직 문항이 없어요. 아래에서 추가하세요.
              </Text>
            </li>
          )}
        </ol>
        {!locked && (
          <div className="flex flex-col gap-2 border-t border-[var(--colors-border-neutral)] p-3">
            <Button tone="neutral" variant="outline" size="sm" fullWidth onClick={addCustom}>
              문항 추가
            </Button>
            <Select aria-label="공통 문항 추가" value="" placeholder="공통 문항 추가…" onChange={(e) => e.target.value && addCommon([e.target.value])}>
              <CommonOptions audience="participants" label="참여 회고" usedKeys={usedKeys} />
              <CommonOptions audience="organizers" label="운영 회고" usedKeys={usedKeys} />
              <CommonOptions audience={undefined} label="양쪽" usedKeys={usedKeys} />
            </Select>
            {items.length === 0 &&
              PRESETS.map((p) => (
                <Button key={p.audience} tone="neutral" variant="ghost" size="sm" fullWidth onClick={() => addCommon(commonQuestionsFor(p.audience).map((q) => q.key))}>
                  {p.label}
                </Button>
              ))}
          </div>
        )}
      </aside>

      {item ? (
        <>
          <section aria-label="문항 편집" className="flex w-[520px] shrink-0 flex-col gap-5 overflow-auto border-r border-[var(--colors-border-neutral)] p-8">
            <div className="flex items-center gap-2">
              <Heading level={2} size={5}>
                {index + 1}번 문항
              </Heading>
              {item.key !== undefined && <Tag tone="brand">공통 · {item.key}</Tag>}
            </div>
            <Select
              label="유형"
              value={view(item).type}
              disabled={locked || item.key !== undefined}
              onChange={(e) => replace({ type: e.target.value as QuestionType, config: null })}
            >
              {questionTypes.map((t) => (
                <option key={t} value={t}>
                  {questionTypeName(t)}
                </option>
              ))}
            </Select>
            {item.key !== undefined ? (
              <TextInput
                label="문구"
                value={view(item).label}
                readOnly
                helperText={
                  varsComplete
                    ? '공통 문항 문구는 고칠 수 없어요 — 설문끼리 비교하려고 고정해 뒀어요'
                    : '설정 탭의 공통 문항 변수를 채우면 {…} 자리가 채워져요'
                }
              />
            ) : (
              <>
                <TextInput label="문구" required value={item.label} readOnly={locked} onChange={(e) => replace({ label: e.target.value })} />
                {!locked && <QuestionConfigEditor question={{ type: item.type, config: item.config ?? null }} onChange={(config) => replace({ config })} />}
              </>
            )}
            <Checkbox label="필수" checked={view(item).required} disabled={locked} onChange={(checked) => replace({ required: checked })} />
            {!locked && (
              <div className="mt-auto flex gap-2">
                <Button tone="neutral" variant="outline" size="sm" disabled={index === 0} onClick={() => move(-1)}>
                  위로
                </Button>
                <Button tone="neutral" variant="outline" size="sm" disabled={index === items.length - 1} onClick={() => move(1)}>
                  아래로
                </Button>
                <div className="ml-auto">
                  <Button
                    tone="danger"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onChange(items.filter((_, i) => i !== index))
                      setSelected(Math.max(0, index - 1))
                    }}
                  >
                    문항 삭제
                  </Button>
                </div>
              </div>
            )}
          </section>
          <Preview key={item.uid} n={index + 1} uid={item.uid} {...view(item)} />
        </>
      ) : (
        <div className="flex grow items-center justify-center bg-[var(--colors-bg-brand)] p-10">
          <Text tone="neutral">왼쪽에서 문항을 추가하면 여기서 고치고, 응답 화면을 미리 볼 수 있어요.</Text>
        </div>
      )}
    </div>
  )
}

// 실제 응답 화면과 같은 입력(registry 의 QuestionInput)을 그대로 그린다. 눌러 볼 수 있지만 저장되지 않는다.
function Preview({ n, uid, type, label, config, required }: { n: number; uid: number; type: QuestionType; label: string; config: QuestionConfig | null; required: boolean }) {
  const [value, setValue] = useState('')
  const headingId = `preview-${uid}`
  return (
    <section aria-label="응답 화면 미리보기" className="flex min-w-0 grow flex-col gap-6 bg-[var(--colors-bg-brand)] px-10 py-8">
      <Text size="xs" weight="semibold" tone="neutral">
        응답 화면 미리보기
      </Text>
      <div className="flex grow flex-col justify-center gap-6">
        <div className="flex items-baseline gap-2">
          <Text weight="bold" tone="brand">
            {n}
          </Text>
          <Heading level={3} size={4} id={headingId} wordBreak="cjk">
            {label || '(문구를 적어 주세요)'}
          </Heading>
        </div>
        {!required && (
          <div>
            <Tag tone="neutral">선택 · 건너뛰어도 돼요</Tag>
          </div>
        )}
        <QuestionInput question={{ id: uid, type, config }} labelledBy={headingId} value={value} onChange={setValue} onSubmit={() => {}} />
      </div>
    </section>
  )
}

function CommonOptions({ audience, label, usedKeys }: { audience: Audience | undefined; label: string; usedKeys: Set<string> }) {
  const remaining = commonQuestions.filter((q) => q.audience === audience && !usedKeys.has(q.key))
  if (remaining.length === 0) return null
  return (
    <optgroup label={label}>
      {remaining.map((q) => (
        <option key={q.key} value={q.key}>
          {q.key} — {q.label}
        </option>
      ))}
    </optgroup>
  )
}
