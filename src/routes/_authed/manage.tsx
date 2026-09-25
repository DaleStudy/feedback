import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Heading, Icon, Text } from 'daleui'
import { Link as LinkIcon } from 'lucide-react'
import { pageHead } from '@/lib/seo'
import { Switch } from '@/components/Switch'
import { dday, formatDeadline } from '@/lib/kst'
import { VISIBILITY } from '@/lib/visibility'
import { closeSurvey, listManagedSurveys, reopenSurvey } from '@/server/functions/manage'

export const Route = createFileRoute('/_authed/manage')({
  loader: () => listManagedSurveys(),
  head: () => pageHead({ title: '설문 관리', path: '/manage', noindex: true }),
  component: ManagePage,
})

type ManagedSurvey = Awaited<ReturnType<typeof listManagedSurveys>>['surveys'][number]
type Filter = 'all' | 'open' | 'closed'

const FILTERS: Array<{ value: Filter; label: string; match: (s: ManagedSurvey) => boolean }> = [
  { value: 'all', label: '전체', match: () => true },
  { value: 'open', label: '진행 중', match: (s) => !s.closed },
  { value: 'closed', label: '마감', match: (s) => s.closed },
]

function ManagePage() {
  const { canCreate, surveys } = Route.useLoaderData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const shown = surveys.filter(FILTERS.find((f) => f.value === filter)?.match ?? (() => true))

  const createButton = canCreate && (
    <Button tone="brand" size="lg" onClick={() => navigate({ to: '/new' })}>
      <Icon name="penLine" size="sm" /> 새 설문 만들기
    </Button>
  )

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Heading level={1} size={2}>
            설문 관리
          </Heading>
          <Text tone="neutral">내가 편집자인 설문이에요.</Text>
        </div>
        {surveys.length > 0 && createButton}
      </div>

      {surveys.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radii-lg)] border border-dashed border-[var(--colors-border-neutral)] px-8 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--colors-bg-brand)]">
            <Icon name="messageCircleMore" size="lg" tone="brand" />
          </div>
          <Heading level={2} size={4} align="center">
            {canCreate ? '아직 만든 설문이 없어요' : '편집자로 추가된 설문이 없어요'}
          </Heading>
          <div className="max-w-md">
            <Text tone="neutral">
              {canCreate
                ? '제목과 설명만 정하면 바로 문항을 넣을 수 있어요. 기본 문항 세트로 몇 분 안에 만들 수 있어요.'
                : '새 설문은 DaleStudy 운영진(maintainer 팀)이 만들 수 있어요. 다른 편집자가 추가해 주면 여기에 보여요.'}
            </Text>
          </div>
          {createButton}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div role="group" aria-label="상태로 거르기" className="flex gap-1 rounded-[var(--radii-md)] bg-[var(--colors-bg-neutral)] p-1">
              {FILTERS.map((f) => {
                const on = filter === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.value)}
                    className={`cursor-pointer rounded-[var(--radii-sm)] px-3.5 py-2 text-sm font-semibold text-[var(--colors-fg-neutral)] ${on ? 'bg-[var(--colors-app-bg)] shadow-sm' : ''}`}
                  >
                    {f.label} <span className="tabular-nums opacity-70">{surveys.filter(f.match).length}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="info" size="sm" tone="info" />
              <Text size="sm" tone="neutral">
                공유하기 전에 미리보기로 끝까지 넘겨 보세요. 미리보기는 응답으로 저장되지 않아요.
              </Text>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {shown.map((s) => (
              <SurveyCard key={s.id} survey={s} />
            ))}
            {shown.length === 0 && (
              <Text tone="neutral" muted>
                해당하는 설문이 없어요.
              </Text>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SurveyCard({ survey }: { survey: ManagedSurvey }) {
  const navigate = useNavigate()
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  // 응답이 있으면 문항이 잠겨 설정만 고칠 수 있다. 버튼 이름이 그걸 말하고, 설정 탭으로 바로 연다. 마감되면 막힌다.
  const locked = survey.responseCount > 0

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/${survey.id}`)
      setCopy('copied')
    } catch {
      setCopy('failed') // 클립보드 권한이 없는 브라우저: 카드의 주소를 직접 복사하게 한다
    }
    setTimeout(() => setCopy('idle'), 2500)
  }

  return (
    <article
      className={`flex flex-col gap-4 rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] p-4 md:px-6 md:py-5 ${
        survey.closed ? 'bg-[var(--colors-bg-neutral)]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Heading level={2} size={5}>
            {survey.title}
          </Heading>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className="font-mono text-[13px]">/{survey.id}</span>
            <span className="flex items-center gap-1.5">
              <Icon name={VISIBILITY[survey.visibility].icon} size="xs" tone="neutral" />
              <Text size="sm" tone="neutral">
                {VISIBILITY[survey.visibility].label}
              </Text>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size="xs" tone="neutral" />
              <Text size="sm" tone="neutral">
                {survey.closesAt
                  ? `${survey.closed ? '' : `${dday(survey.closesAt)} · `}${formatDeadline(survey.closesAt)} 마감`
                  : '마감 없음'}
              </Text>
            </span>
          </div>
        </div>
        <OpenSwitch surveyId={survey.id} closed={survey.closed} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--colors-border-neutral)] pt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{survey.responseCount}</span>
          <Text size="sm" tone="neutral">
            명 응답
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button tone="neutral" variant="ghost" size="sm" onClick={copyLink}>
            {copy === 'copied' ? <Icon name="check" size="sm" /> : <LinkIcon size={16} aria-hidden />}
            {copy === 'copied' ? '복사했어요' : copy === 'failed' ? '복사하지 못했어요' : '링크 복사'}
          </Button>
          <Button tone="neutral" variant="ghost" size="sm" onClick={() => navigate({ to: '/$surveyId', params: { surveyId: survey.id }, search: { preview: true } })}>
            <Icon name="eye" size="sm" /> 미리보기
          </Button>
          <Button
            tone="neutral"
            variant="outline"
            size="sm"
            disabled={survey.closed}
            onClick={() => navigate({ to: '/$surveyId/edit', params: { surveyId: survey.id }, search: locked ? { tab: 'settings' } : {} })}
          >
            <Icon name="penLine" size="sm" /> {locked ? '설정' : '편집'}
          </Button>
          <Button
            tone="brand"
            variant={survey.closed || locked ? 'solid' : 'outline'}
            size="sm"
            onClick={() => navigate({ to: '/$surveyId/results', params: { surveyId: survey.id } })}
          >
            결과 보기 <Icon name="chevronRight" size="sm" />
          </Button>
        </div>
      </div>
    </article>
  )
}

// 켜면 진행 중, 끄면 바로 마감. 다시 켜면 마감일이 없어진다. 새 마감일은 편집 화면에서 정한다.
function OpenSwitch({ surveyId, closed }: { surveyId: string; closed: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    setPending(true)
    setError(null)
    try {
      await (closed ? reopenSurvey : closeSurvey)({ data: { surveyId } })
      await router.invalidate()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 whitespace-nowrap">
      <Switch checked={!closed} onChange={toggle} label={closed ? '마감' : '진행 중'} disabled={pending} />
      {error && (
        <Text size="xs" tone="danger">
          {error}
        </Text>
      )}
    </div>
  )
}
