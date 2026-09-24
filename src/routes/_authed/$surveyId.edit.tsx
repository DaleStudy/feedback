import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Heading, Icon, Tag, Text, TextInput } from 'daleui'
import { pageHead } from '@/lib/seo'
import { AppLink } from '@/components/AppLink'
import { type BuilderItem, SurveyBuilder, withUid } from '@/components/SurveyBuilder'
import { type SurveyFormValues, SurveySettings, emptyVars } from '@/components/SurveySettings'
import { addEditor, deleteSurvey, getSurveyForEdit, removeEditor, saveQuestions, updateSurvey } from '@/server/functions/manage'

// 설문 편집. 빌더라 화면 전체를 쓴다 (staticData.bare → __root).
export const Route = createFileRoute('/_authed/$surveyId/edit')({
  staticData: { bare: true },
  // ?tab=settings: 응답이 있어 문항이 잠긴 설문은 관리 목록의 "설정" 버튼이 설정 탭으로 바로 연다
  validateSearch: (search: Record<string, unknown>): { tab?: 'settings' } => (search.tab === 'settings' ? { tab: 'settings' } : {}),
  loader: ({ params }) => getSurveyForEdit({ data: { surveyId: params.surveyId } }),
  head: ({ loaderData, params }) =>
    pageHead({ title: `편집 · ${loaderData?.title ?? ''}`, path: `/${params.surveyId}/edit`, noindex: true }),
  component: EditSurveyPage,
})

function EditSurveyPage() {
  const survey = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const search = Route.useSearch()
  const [tab, setTab] = useState<'questions' | 'settings'>(search.tab ?? 'questions')
  const [fields, setFields] = useState<SurveyFormValues>({
    title: survey.title,
    description: survey.description,
    listed: survey.listed,
    closesAt: survey.closesAt,
    vars: survey.vars ?? emptyVars,
  })
  const [items, setItems] = useState<BuilderItem[]>(() =>
    survey.questions.map((q) =>
      withUid(q.key !== null ? { key: q.key, required: q.required } : { type: q.type, label: q.label, required: q.required, config: q.config }),
    ),
  )
  const [fieldsDirty, setFieldsDirty] = useState(false)
  const [itemsDirty, setItemsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')

  const dirty = fieldsDirty || itemsDirty

  // 설정(공통 문항 변수 포함)을 먼저 저장해야 서버가 새 변수로 공통 문항 문구를 채운다
  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (fieldsDirty) await updateSurvey({ data: { surveyId: survey.id, ...fields } })
      if (itemsDirty) await saveQuestions({ data: { surveyId: survey.id, questions: items.map(({ uid: _uid, ...q }) => q) } })
      setFieldsDirty(false)
      setItemsDirty(false)
      await router.invalidate()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/${survey.id}`)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
    setTimeout(() => setCopy('idle'), 2500)
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--colors-app-bg)] text-[var(--colors-fg-neutral)]">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--colors-border-neutral)] px-6">
        <AppLink to="/manage" tone="neutral" size="sm" underline={false}>
          <Icon name="chevronLeft" size="sm" /> 설문 관리
        </AppLink>
        <div className="h-6 w-px bg-[var(--colors-border-neutral)]" />
        <Text weight="semibold" tone="neutral">
          {fields.title || '(제목 없음)'}
        </Text>
        <Tag tone={survey.locked ? 'warning' : 'neutral'}>
          {survey.locked ? `응답 ${survey.responseCount}건 · 문항 잠김` : '응답 0건 · 고칠 수 있어요'}
        </Tag>
        <div className="ml-auto flex items-center gap-3">
          {error ? (
            <Text size="sm" tone="danger">
              {error}
            </Text>
          ) : (
            dirty && (
              <Text size="sm" tone="neutral" muted>
                저장하지 않은 변경이 있어요
              </Text>
            )
          )}
          <AppLink to="/$surveyId" params={{ surveyId: survey.id }} search={{ preview: true }} tone="brand" size="sm">
            미리보기
          </AppLink>
          <Button tone="neutral" variant="outline" size="sm" onClick={copyLink}>
            {copy === 'copied' ? '복사했어요' : copy === 'failed' ? '복사하지 못했어요' : '링크 복사'}
          </Button>
          <Button tone="brand" size="sm" disabled={!dirty} loading={saving} onClick={save}>
            저장
          </Button>
        </div>
      </header>

      <div role="tablist" aria-label="편집 화면" className="flex h-12 shrink-0 gap-6 border-b border-[var(--colors-border-neutral)] px-6">
        <TabButton active={tab === 'questions'} onClick={() => setTab('questions')}>
          문항 {items.length}
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          설정
        </TabButton>
      </div>

      {tab === 'questions' ? (
        <>
          {survey.locked && (
            <div className="border-b border-[var(--colors-border-neutral)] bg-[var(--colors-bg-warning)] px-6 py-2">
              <Text size="sm" tone="neutral">
                응답이 있어 문항은 고칠 수 없어요. 설정 탭에서 제목·설명·마감일·공개 범위만 바꿀 수 있어요.
              </Text>
            </div>
          )}
          <SurveyBuilder
            items={items}
            onChange={(next) => {
              setItems(next)
              setItemsDirty(true)
            }}
            vars={fields.vars}
            locked={survey.locked}
          />
        </>
      ) : (
        <div className="min-h-0 grow overflow-auto">
          <div className="mx-auto flex max-w-[720px] flex-col gap-10 px-6 py-10">
            <SurveySettings
              value={fields}
              onChange={(next) => {
                setFields(next)
                setFieldsDirty(true)
              }}
              locked={survey.locked}
            />
            <Editors surveyId={survey.id} editors={survey.editors} me={user?.login ?? ''} />
            {!survey.locked && <DeleteSurvey surveyId={survey.id} />}
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px cursor-pointer border-b-2 text-[15px] font-semibold ${
        active ? 'border-[var(--colors-bg-solid-brand)] text-[var(--colors-fg-brand)]' : 'border-transparent text-[var(--colors-fg-neutral)]'
      }`}
    >
      {children}
    </button>
  )
}

// 편집자는 바로 저장된다 (위의 저장 버튼과 따로)
function Editors({ surveyId, editors, me }: { surveyId: string; editors: string[]; me: string }) {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
      await router.invalidate()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Heading level={2} size={5}>
          편집자
        </Heading>
        <Text size="sm" tone="neutral">
          편집자는 문항을 고치고 결과를 볼 수 있어요. 바꾸면 바로 저장돼요.
        </Text>
      </div>
      <ul className="flex flex-col border-t border-[var(--colors-border-neutral)]">
        {editors.map((e) => (
          <li key={e} className="flex items-center gap-3 border-b border-[var(--colors-border-neutral)] py-3">
            <Text tone="neutral">@{e}</Text>
            {e === me && <Tag tone="neutral">나</Tag>}
            <div className="ml-auto">
              <Button
                tone="neutral"
                variant="ghost"
                size="sm"
                disabled={editors.length <= 1}
                onClick={() => run(() => removeEditor({ data: { surveyId, login: e } }))}
              >
                빼기
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await addEditor({ data: { surveyId, login } })
            setLogin('')
          })
        }}
      >
        <div className="grow">
          <TextInput label="편집자 추가" placeholder="GitHub 아이디" leadingIcon="user" value={login} onChange={(e) => setLogin(e.target.value)} />
        </div>
        <Button type="submit" tone="neutral" variant="outline" disabled={!login.trim()}>
          추가
        </Button>
      </form>
      {error && (
        <Text size="sm" tone="danger">
          {error}
        </Text>
      )}
    </section>
  )
}

function DeleteSurvey({ surveyId }: { surveyId: string }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleDelete = async () => {
    setError(null)
    try {
      await deleteSurvey({ data: { surveyId } })
      await navigate({ to: '/manage' })
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <section className="flex flex-col gap-3 border-t border-[var(--colors-border-neutral)] pt-6">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text tone="danger">이 설문과 문항을 지워요. 되돌릴 수 없어요.</Text>
          <Button tone="danger" size="sm" onClick={handleDelete}>
            삭제
          </Button>
          <Button tone="neutral" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            취소
          </Button>
        </div>
      ) : (
        <div>
          <Button tone="danger" variant="outline" size="sm" onClick={() => setConfirming(true)}>
            설문 삭제
          </Button>
        </div>
      )}
      <Text size="sm" tone="neutral">
        응답이 없을 때만 지울 수 있어요.
      </Text>
      {error && (
        <Text size="sm" tone="danger">
          {error}
        </Text>
      )}
    </section>
  )
}
