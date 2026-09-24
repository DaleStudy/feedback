import { Link, createFileRoute } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button, Heading, Icon, Link as DaleLink, Tag, Text } from 'daleui'
import { AppLink } from '@/components/AppLink'
import { Logo } from '@/components/Logo'
import { formatDeadline } from '@/lib/kst'
import { QuestionInput, questionBehavior } from '@/questions/registry'
import { pageHead, summarize } from '@/lib/seo'
import { getSurvey, getSurveyPreview, submitResponse } from '@/server/functions/surveys'

// 한 화면에 한 질문. 사이트 헤더 없이 화면 전체를 쓴다 (staticData.bare → __root).
// 로그인 가드(_authed) 밖에 둔다: 로그인 전에도 설문 소개가 보이고, SNS 미리보기 봇도 제목·설명을 읽는다.
export const Route = createFileRoute('/$surveyId/')({
  staticData: { bare: true },
  // ?preview=true: 편집자가 공유 전에 끝까지 넘겨 보는 모드. 제출하지 않으므로 응답이 생기지 않는다.
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } => (search.preview === true ? { preview: true } : {}),
  loader: async ({ params, context }) => ({
    preview: await getSurveyPreview({ data: { surveyId: params.surveyId } }),
    survey: context.user ? await getSurvey({ data: { surveyId: params.surveyId } }) : null,
  }),
  head: ({ loaderData, params }) => {
    if (!loaderData) return {}
    const { preview } = loaderData
    const facts = `약 ${preview.minutes}분 · ${preview.questionCount}문항`
    return pageHead({
      title: preview.title,
      description: preview.description ? `${facts} — ${summarize(preview.description)}` : facts,
      path: `/${params.surveyId}`,
      noindex: true,
    })
  },
  component: SurveyPage,
})

type SurveyData = Awaited<ReturnType<typeof getSurvey>>
type Preview = Awaited<ReturnType<typeof getSurveyPreview>>

function SurveyPage() {
  const { preview, survey } = Route.useLoaderData()
  const search = Route.useSearch()
  return survey ? <SurveyFlow survey={survey} previewMode={Boolean(search.preview && survey.canReview)} /> : <GuestIntro preview={preview} />
}

// 척도·선택을 고른 뒤 다음 질문으로 넘어가기 전 잠깐 멈춘다. 고른 것이 눈에 들어오도록.
const AUTO_ADVANCE_MS = 320

function SurveyFlow({ survey, previewMode }: { survey: SurveyData; previewMode: boolean }) {
  const total = survey.questions.length
  // 0 = 시작 화면, 1..total = 질문, total + 1 = 제출 완료
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const questionRef = useRef<HTMLDivElement>(null)

  const current = step >= 1 && step <= total ? survey.questions[step - 1] : null
  const done = step > total
  // 미리보기에서는 이미 답했거나 마감된 설문도 끝까지 넘겨 볼 수 있다
  const answered = survey.answered && !previewMode
  const closed = survey.closed && !previewMode

  useEffect(() => () => clearTimeout(timer.current), [])

  // 질문이 바뀌면 입력칸(없으면 질문)으로 초점을 옮긴다. 키보드·스크린리더 사용자가 새 질문에서 시작하도록.
  useEffect(() => {
    if (!current) return
    const block = questionRef.current
    const field = block?.querySelector<HTMLElement>('textarea, input')
    ;(field ?? block)?.focus()
  }, [current?.id])

  // 시작 화면에서 Enter 로 시작
  useEffect(() => {
    if (step !== 0 || total === 0 || answered || closed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) setStep(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, total, answered, closed])

  const submit = async (all: Record<number, string>) => {
    if (previewMode) {
      setStep(total + 1)
      return
    }
    setSubmitting(true)
    try {
      await submitResponse({
        data: { surveyId: survey.id, answers: Object.entries(all).map(([questionId, value]) => ({ questionId: Number(questionId), value })) },
      })
      setStep(total + 1)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = (all = values) => {
    clearTimeout(timer.current)
    if (!current) return
    if (current.required && !(all[current.id] ?? '').trim()) {
      setError('필수 문항이에요. 답을 고르거나 적은 뒤 넘어가 주세요.')
      return
    }
    setError(null)
    if (step === total) void submit(all)
    else setStep(step + 1)
  }

  const goPrev = () => {
    clearTimeout(timer.current)
    setError(null)
    setStep(Math.max(1, step - 1))
  }

  const change = (value: string) => {
    if (!current) return
    const all = { ...values, [current.id]: value }
    setValues(all)
    setError(null)
    // 마지막 질문은 자동으로 제출하지 않는다. 제출은 직접 누르게 한다.
    if (questionBehavior(current.type).autoAdvance && step < total) {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => goNext(all), AUTO_ADVANCE_MS)
    }
  }

  const progress = done ? 100 : current ? ((step - 1) / total) * 100 : 0

  let body: ReactNode
  if (done && previewMode) {
    body = (
      <Ending icon="check" tone="success" title="미리보기를 마쳤어요" editSurveyId={survey.id}>
        미리보기라 응답은 저장하지 않았어요.
      </Ending>
    )
  } else if (done) {
    body = (
      <Ending icon="check" tone="success" title="고마워요">
        응답이 저장됐어요. 제출한 답은 고칠 수 없어요.
      </Ending>
    )
  } else if (answered) {
    body = (
      <Ending icon="check" tone="success" title="이미 응답하셨어요" canReview={survey.canReview} surveyId={survey.id}>
        같은 설문에는 한 번만 답할 수 있어요.
      </Ending>
    )
  } else if (closed) {
    body = (
      <Ending icon="clock" tone="neutral" title="마감된 설문이에요" canReview={survey.canReview} surveyId={survey.id}>
        {survey.closesAt ? `${formatDeadline(survey.closesAt)}에 마감됐어요.` : '더 이상 응답을 받지 않아요.'}
      </Ending>
    )
  } else if (!current) {
    body = (
      <div className="flex max-w-[840px] flex-col items-start gap-6">
        <Heading level={1} size={1} wordBreak="cjk">
          {survey.title}
        </Heading>
        {survey.description && (
          <Text as="p" size="lg" tone="neutral" style={{ whiteSpace: 'pre-line' }}>
            {survey.description}
          </Text>
        )}
        <div className="flex items-center gap-2">
          <Icon name="clock" size="sm" tone="neutral" />
          <Text size="sm" tone="neutral">
            약 {survey.minutes}분 · {total}문항{survey.closesAt ? ` · ${formatDeadline(survey.closesAt)} 마감` : ''}
          </Text>
        </div>
        {total === 0 ? (
          <Text tone="neutral">아직 문항이 없어요.</Text>
        ) : (
          <div className="flex items-center gap-4">
            <Button tone="brand" size="lg" onClick={() => setStep(1)}>
              시작하기 <Icon name="chevronRight" size="sm" />
            </Button>
            <span className="hidden md:inline">
              <Text size="sm" tone="neutral" muted>
                또는 Enter ↵
              </Text>
            </span>
          </div>
        )}
      </div>
    )
  } else {
    const headingId = `question-${current.id}`
    body = (
      <div ref={questionRef} tabIndex={-1} className="flex max-w-[840px] flex-col gap-8 outline-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline">
          <div className="flex min-w-12 items-center gap-1">
            <Text size="2xl" weight="bold" tone="brand">
              {step}
            </Text>
            <Icon name="chevronRight" size="md" tone="brand" />
          </div>
          <div className="flex flex-col gap-3">
            <Heading level={2} size={2} id={headingId} wordBreak="cjk">
              {current.label}
            </Heading>
            {!current.required && (
              <div>
                <Tag tone="neutral">선택 · 건너뛰어도 돼요</Tag>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-6 md:pl-15">
          <QuestionInput
            key={current.id}
            question={current}
            labelledBy={headingId}
            value={values[current.id] ?? ''}
            onChange={change}
            onSubmit={() => goNext()}
          />
          {error && (
            <div role="alert" className="flex items-center gap-2">
              <Icon name="circleAlert" size="sm" tone="danger" />
              <Text size="sm" tone="danger">
                {error}
              </Text>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Button tone="brand" size="lg" loading={submitting} onClick={() => goNext()}>
              {step === total ? '제출하기' : '확인'} <Icon name="check" size="sm" />
            </Button>
            <span className="hidden md:inline">
              <Text size="sm" tone="neutral" muted>
                {questionBehavior(current.type).hint}
              </Text>
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Stage
      progress={progress}
      counter={[previewMode && '미리보기', current && `${step} / ${total}`].filter(Boolean).join(' · ') || null}
      nav={
        current && (
          <nav aria-label="질문 이동" className="flex justify-end gap-2 pb-8">
            <Button tone="neutral" variant="outline" size="sm" disabled={step <= 1} onClick={goPrev}>
              <Icon name="chevronLeft" size="sm" /> 이전
            </Button>
            <Button tone="neutral" variant="outline" size="sm" onClick={() => goNext()}>
              다음 <Icon name="chevronRight" size="sm" />
            </Button>
          </nav>
        )
      }
    >
      {body}
    </Stage>
  )
}

// 로그인 전: 설문 소개와 로그인 링크. 링크를 받은 사람이 무엇을 답할지 먼저 보고 로그인한다.
function GuestIntro({ preview }: { preview: Preview }) {
  return (
    <Stage progress={0} counter={null} nav={null}>
      <div className="flex max-w-[840px] flex-col items-start gap-6">
        <Heading level={1} size={1} wordBreak="cjk">
          {preview.title}
        </Heading>
        {preview.description && (
          <Text as="p" size="lg" tone="neutral" style={{ whiteSpace: 'pre-line' }}>
            {preview.description}
          </Text>
        )}
        <div className="flex items-center gap-2">
          <Icon name="clock" size="sm" tone="neutral" />
          <Text size="sm" tone="neutral">
            약 {preview.minutes}분 · {preview.questionCount}문항{preview.closesAt ? ` · ${formatDeadline(preview.closesAt)} 마감` : ''}
          </Text>
        </div>
        {preview.closed ? (
          <Text tone="neutral">마감된 설문이에요.</Text>
        ) : (
          // /login 은 서버 라우트라 라우터 링크가 아니라 평범한 링크로 간다
          <DaleLink href={`/login?redirect=${encodeURIComponent(`/${preview.id}`)}`} tone="brand" size="lg" underline={false}>
            <Icon name="GitHub" size="sm" /> GitHub로 로그인하고 시작하기
          </DaleLink>
        )}
      </div>
    </Stage>
  )
}

// 응답 화면의 바깥 틀: 진행 막대 · 로고와 문항 번호 · 가운데 본문 · 아래 이동 버튼
function Stage({ progress, counter, nav, children }: { progress: number; counter: string | null; nav: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--colors-bg-brand)] text-[var(--colors-fg-neutral)]">
      <div
        role="progressbar"
        aria-label="진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="fixed inset-x-0 top-0 z-10 h-1 bg-[var(--colors-bg-brand-active)]"
      >
        <div className="h-1 bg-[var(--colors-bg-solid-brand)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="mx-auto flex min-h-screen max-w-[912px] flex-col px-6">
        <header className="flex items-center justify-between gap-4 pt-6">
          <Link to="/" aria-label="달레 스터디 피드백 홈" className="flex items-center gap-2 no-underline">
            <Logo width={28} height={12} />
            <Text size="sm" weight="semibold" tone="neutral">
              달레 스터디 피드백
            </Text>
          </Link>
          {counter && (
            <Text size="sm" tone="neutral" muted>
              {counter}
            </Text>
          )}
        </header>
        <main className="flex grow flex-col justify-center py-16">{children}</main>
        {nav}
      </div>
    </div>
  )
}

function Ending({
  icon,
  tone,
  title,
  canReview,
  surveyId,
  editSurveyId,
  children,
}: {
  icon: 'check' | 'clock'
  tone: 'success' | 'neutral'
  title: string
  canReview?: boolean
  surveyId?: string
  editSurveyId?: string
  children: ReactNode
}) {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-6">
      <div
        className={`flex size-16 items-center justify-center rounded-full ${tone === 'success' ? 'bg-[var(--colors-bg-success)]' : 'bg-[var(--colors-bg-neutral)]'}`}
      >
        <Icon name={icon} size="lg" tone={tone} />
      </div>
      <Heading level={1} size={1} wordBreak="cjk">
        {title}
      </Heading>
      <Text as="p" size="lg" tone="neutral">
        {children}
      </Text>
      <div className="flex gap-6">
        <AppLink to="/" tone="brand" size="lg">
          홈으로
        </AppLink>
        {canReview && surveyId && (
          <AppLink to="/$surveyId/results" params={{ surveyId }} tone="brand" size="lg">
            결과 보기
          </AppLink>
        )}
        {editSurveyId && (
          <AppLink to="/$surveyId/edit" params={{ surveyId: editSurveyId }} tone="brand" size="lg">
            편집으로 돌아가기
          </AppLink>
        )}
      </div>
    </div>
  )
}
