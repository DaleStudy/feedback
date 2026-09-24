import { createFileRoute } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { Button, Heading, Icon, Tag, Text } from 'daleui'
import { AppLink } from '@/components/AppLink'
import { toCsv } from '@/lib/csv'
import { dday, formatDeadline } from '@/lib/kst'
import { pageHead } from '@/lib/seo'
import { average, share } from '@/questions/Distribution'
import { QuestionResult, resultSection } from '@/questions/registry'
import { getSurveyResults } from '@/server/functions/surveys'

export const Route = createFileRoute('/_authed/$surveyId/results')({
  loader: ({ params }) => getSurveyResults({ data: { surveyId: params.surveyId } }),
  head: ({ loaderData, params }) =>
    pageHead({ title: `결과 · ${loaderData?.title ?? ''}`, path: `/${params.surveyId}/results`, noindex: true }),
  component: ResultsPage,
})

type Result = Awaited<ReturnType<typeof getSurveyResults>>

// 공통 문항 중 요약 카드와 구역 제목에 쓰는 이름. 이 key 가 없는 설문은 해당 카드가 빠진다.
const NAMES: Record<string, string> = { recommend: '추천 의향', rejoin: '다시 참여', join_organizers: '운영진 관심' }

function ResultsPage() {
  const result = Route.useLoaderData()
  const byKey = (key: string) => result.questions.find((q) => q.key === key)

  // 이름과 함께 받은 문항(identified)은 따로 모은다. 나머지는 유형이 정한 구역(숫자형·서술형)으로.
  const identified = result.questions.filter((q) => q.respondents !== null)
  const numbers = result.questions.filter((q) => q.respondents === null && resultSection(q.type) === 'numbers')
  const answers = result.questions.filter((q) => q.respondents === null && resultSection(q.type) === 'answers')
  const ordered = [...numbers, ...identified, ...answers]

  const recommend = byKey('recommend')
  const rejoin = byKey('rejoin')
  const organizers = byKey('join_organizers')
  const recommendAvg = recommend ? average(recommend.values) : null
  const rejoinYes = rejoin ? (rejoin.config as { options?: string[] } | null)?.options?.[0] : undefined
  const stats = [
    { label: '응답', value: String(result.responseCount), unit: '명', note: '제출한 사람 수' },
    recommend && {
      label: NAMES.recommend,
      value: recommendAvg === null ? '–' : recommendAvg.toFixed(1),
      unit: '/ 5',
      note: `${recommend.position}번 문항 평균`,
    },
    rejoin &&
      rejoinYes && {
        label: NAMES.rejoin,
        value: String(share(rejoin.values, rejoinYes) ?? '–'),
        unit: '%',
        note: `${result.responseCount}명 중 ${rejoin.values.filter((v) => v === rejoinYes).length}명이 ${rejoinYes}`,
      },
    organizers && { label: NAMES.join_organizers, value: String(organizers.values.length), unit: '명', note: '연락처를 남긴 사람' },
  ].filter((s): s is Exclude<typeof s, undefined | false | '' | null> => !!s)

  return (
    <div className="flex flex-col gap-8">
      <Header result={result} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5 rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] px-4 py-4 md:px-6 md:py-5">
            <Text size="sm" weight="medium" tone="neutral">
              {s.label}
            </Text>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] leading-tight font-bold tabular-nums md:text-4xl">{s.value}</span>
              <span className="text-sm md:text-base">{s.unit}</span>
            </div>
            <span className="hidden md:block">
              <Text size="xs" tone="neutral" muted>
                {s.note}
              </Text>
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-10">
        <nav aria-label="문항 목록" className="sticky top-6 hidden w-52 shrink-0 flex-col gap-0.5 lg:flex">
          <div className="px-3 pb-2">
            <Text size="xs" weight="semibold" tone="neutral" muted>
              문항 {result.questions.length}개
            </Text>
          </div>
          {ordered.map((q) => (
            <a
              key={q.id}
              href={`#q${q.position}`}
              className="flex items-center gap-2 rounded-[var(--radii-md)] px-3 py-2 no-underline hover:bg-[var(--colors-bg-brand)]"
            >
              <span className="w-5 shrink-0 text-[13px] font-bold text-[var(--colors-fg-brand)] tabular-nums">{q.position}</span>
              <span className="min-w-0 grow truncate text-sm text-[var(--colors-fg-neutral)]">{q.label}</span>
              <span className="text-xs text-[var(--colors-fg-neutral)] tabular-nums opacity-75">{q.values.length}</span>
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 grow flex-col gap-10">
          {numbers.length > 0 && (
            <Section title="숫자로 보기">
              <div className="overflow-hidden rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)]">
                {numbers.map((q) => (
                  <div key={q.id} id={`q${q.position}`} className="flex gap-4 border-b border-[var(--colors-border-neutral)] p-4 last:border-b-0 md:p-6">
                    <QuestionNumber n={q.position} />
                    <div className="flex min-w-0 grow flex-col gap-3">
                      <Text weight="semibold" tone="neutral">
                        {q.label}
                      </Text>
                      <QuestionResult question={q} values={q.values} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {identified.map((q) => (
            <Section key={q.id} id={`q${q.position}`} title={(q.key && NAMES[q.key]) || '이름과 함께 받은 답'} count={`${q.values.length}명`}>
              <div className="rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] px-4 py-2 md:px-6">
                <div className="py-3">
                  <Text size="sm" tone="neutral" muted>
                    {q.position} · {q.label}
                  </Text>
                </div>
                {q.respondents?.length ? (
                  q.respondents.map((r) => (
                    <div key={r.login} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--colors-border-neutral)] py-3.5">
                      <Icon name="user" size="sm" tone="brand" />
                      <Text weight="semibold" tone="neutral">
                        @{r.login}
                      </Text>
                      <span className="ml-auto">
                        <Text size="sm" tone="neutral">
                          {r.value}
                        </Text>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="border-t border-[var(--colors-border-neutral)] py-3.5">
                    <Text size="sm" tone="neutral" muted>
                      아직 답이 없어요
                    </Text>
                  </div>
                )}
              </div>
            </Section>
          ))}

          {answers.length > 0 && (
            <Section title="서술형 답변">
              {answers.map((q) => (
                <div key={q.id} id={`q${q.position}`} className="flex flex-col gap-3 rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] p-4 md:p-6">
                  <div className="flex items-start gap-3">
                    <QuestionNumber n={q.position} />
                    <div className="min-w-0 grow">
                      <Text weight="semibold" tone="neutral">
                        {q.label}
                      </Text>
                    </div>
                    <span className="shrink-0 whitespace-nowrap">
                      <Tag tone="neutral">{q.required ? `${q.values.length}개` : `선택 · ${q.values.length}개`}</Tag>
                    </span>
                  </div>
                  <div className="md:pl-9">
                    <QuestionResult question={q} values={q.values} />
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ result }: { result: Result }) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/${result.id}`)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
    setTimeout(() => setCopy('idle'), 2500)
  }

  const downloadCsv = () => {
    const blob = new Blob([toCsv([result.table.header, ...result.table.rows])], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.title}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <AppLink to="/manage" tone="neutral" size="sm" underline={false}>
          <Icon name="chevronLeft" size="sm" /> 설문 관리
        </AppLink>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Heading level={1} size={2} wordBreak="cjk">
            {result.title}
          </Heading>
          <div className="flex flex-wrap items-center gap-3">
            <Tag tone={result.closed ? 'neutral' : 'success'}>{result.closed ? '마감' : '진행 중'}</Tag>
            <Text size="sm" tone="neutral">
              {result.closesAt
                ? `${result.closed ? '' : `${dday(result.closesAt)} · `}${formatDeadline(result.closesAt)} 마감`
                : '마감 없음'}
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="neutral" variant="outline" size="sm" onClick={copyLink}>
            {copy === 'copied' ? '복사했어요' : copy === 'failed' ? '복사하지 못했어요' : '링크 복사'}
          </Button>
          <Button tone="neutral" variant="outline" size="sm" disabled={result.responseCount === 0} onClick={downloadCsv}>
            CSV 내려받기
          </Button>
          <AppLink to="/$surveyId/edit" params={{ surveyId: result.id }} tone="brand" size="sm">
            편집
          </AppLink>
        </div>
      </div>
    </div>
  )
}

function Section({ id, title, count, children }: { id?: string; title: string; count?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Heading level={2} size={5}>
          {title}
        </Heading>
        {count && <Tag tone="brand">{count}</Tag>}
      </div>
      {children}
    </section>
  )
}

function QuestionNumber({ n }: { n: number }) {
  return <span className="w-6 shrink-0 text-[15px] font-bold text-[var(--colors-fg-brand)] tabular-nums">{n}</span>
}
