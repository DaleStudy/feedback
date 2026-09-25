import { Link, createFileRoute } from '@tanstack/react-router'
import { Heading, Icon, Tag, Text } from 'daleui'
import { pageHead } from '@/lib/seo'
import { daysLeft, dday, formatDeadline } from '@/lib/kst'
import { listMySurveys } from '@/server/functions/surveys'

export const Route = createFileRoute('/')({
  loader: ({ context }) => (context.user ? listMySurveys() : null),
  head: () => pageHead({ path: '/' }),
  component: HomePage,
})

type MySurvey = NonNullable<Awaited<ReturnType<typeof listMySurveys>>>[number]

// 마감이 이만큼 남으면 D-day 를 경고색으로
const URGENT_DAYS = 3

// daleui Button 은 링크가 될 수 없어 같은 모양의 링크를 토큰으로 그린다
const solidBrand =
  'inline-flex items-center justify-center gap-1.5 rounded-[var(--radii-md)] bg-[var(--colors-bg-solid-brand)] font-semibold whitespace-nowrap text-[var(--colors-fg-solid-brand)] no-underline'

function HomePage() {
  const surveys = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  if (!surveys || !user) return <Welcome />

  const open = surveys.filter((s) => !s.answered && !s.closed)
  const past = surveys.filter((s) => s.answered || s.closed)

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-10 md:gap-12">
      <section className="flex flex-col gap-5 md:gap-6">
        <div className="flex flex-col gap-2">
          <Text tone="neutral">안녕하세요, @{user.login} 님</Text>
          <Heading level={1} size={2}>
            {open.length
              ? `진행 중인 설문이 ${open.length}개 있어요`
              : past.some((s) => s.answered)
                ? '모든 설문에 답했어요'
                : '지금 진행 중인 설문이 없어요'}
          </Heading>
        </div>
        {open.map((s) => (
          <OpenSurveyCard key={s.id} survey={s} />
        ))}
        {open.length === 0 && (
          <div
            className={`flex items-center gap-4 rounded-[var(--radii-lg)] px-5 py-5 md:gap-5 md:px-7 md:py-6 ${
              past.some((s) => s.answered) ? 'bg-[var(--colors-bg-success)]' : 'border border-[var(--colors-border-neutral)]'
            }`}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--colors-app-bg)]">
              <Icon
                name={past.some((s) => s.answered) ? 'check' : 'messageCircleMore'}
                size="lg"
                tone={past.some((s) => s.answered) ? 'success' : 'neutral'}
              />
            </div>
            <div className="flex flex-col gap-1">
              {past.some((s) => s.answered) && <Text weight="semibold">남겨 주신 피드백 고마워요</Text>}
              <Text size="sm" tone="neutral">
                새 설문이 열리면 여기에 보여요. 설문 링크는 프로그램 채널에도 공유돼요.
              </Text>
            </div>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3 md:gap-4">
          <Heading level={2} size={5}>
            지난 설문
          </Heading>
          <ul className="m-0 list-none divide-y divide-[var(--colors-border-neutral)] overflow-hidden rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] p-0">
            {past.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5 md:gap-4 md:px-6 md:py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Text weight="medium">{s.title}</Text>
                  {s.closesAt && (
                    <Text size="sm" tone="neutral" muted>
                      {formatDeadline(s.closesAt)} 마감
                    </Text>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap">
                  <Tag tone={s.answered ? 'success' : 'neutral'}>{s.answered ? '응답 완료' : '응답 안 함'}</Tag>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// 카드 전체가 링크다. 안의 "피드백 남기기"는 버튼 모양일 뿐 링크 안에 버튼을 두지 않는다.
function OpenSurveyCard({ survey }: { survey: MySurvey }) {
  const left = survey.closesAt ? daysLeft(survey.closesAt) : null
  const dueTone = left !== null && left <= URGENT_DAYS ? 'danger' : 'brand'

  return (
    <Link
      to="/$surveyId"
      params={{ surveyId: survey.id }}
      className="flex flex-col gap-3.5 rounded-[var(--radii-lg)] border border-[var(--colors-border-neutral)] p-[18px] text-inherit no-underline transition-[border-color,box-shadow] hover:border-[var(--colors-border-brand)] hover:shadow-[0_4px_16px_rgba(83,51,225,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colors-border-brand-focus)] md:gap-5 md:px-7 md:py-6"
    >
      {(survey.invited || survey.closesAt) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {survey.invited ? <Tag tone="info">나에게 요청된 설문</Tag> : <span />}
          {survey.closesAt && (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="clock" size="sm" tone={dueTone} />
              <Text size="sm" weight="semibold" tone={dueTone}>
                {dday(survey.closesAt)} · {formatDeadline(survey.closesAt)} 마감
              </Text>
            </span>
          )}
        </div>
      )}
      <Heading level={2} size={4}>
        {survey.title}
      </Heading>
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between md:border-t md:border-[var(--colors-border-neutral)] md:pt-5">
        <Text size="sm" tone="neutral">
          약 {survey.minutes}분 · {survey.questionCount}문항
        </Text>
        <span className={`${solidBrand} h-12 md:h-11 md:px-5`}>
          피드백 남기기 <Icon name="chevronRight" size="sm" />
        </span>
      </div>
    </Link>
  )
}

function Welcome() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-7 py-8 text-center break-keep md:py-16">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--colors-bg-brand)]">
        <Icon name="messageCircleMore" size="lg" tone="brand" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <Heading level={1} size={2} align="center">
          피드백을 남겨 주세요
        </Heading>
        <Text tone="neutral">
          달레 스터디 프로그램의 회고 설문을 한곳에 모아요. GitHub로 로그인하면 내가 답할 설문이 바로 보여요.
        </Text>
      </div>
      {/* /login 은 서버 라우트라 라우터 링크가 아니라 평범한 링크로 간다 */}
      <a href="/login" className={`${solidBrand} h-12 px-6 text-lg`}>
        <Icon name="GitHub" size="sm" /> GitHub로 로그인
      </a>
      <div className="flex w-full flex-col gap-2.5 rounded-[var(--radii-md)] border border-[var(--colors-border-neutral)] px-6 py-5 text-left">
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 pt-0.5">
            <Icon name="eyeOff" size="sm" tone="neutral" />
          </span>
          <Text size="sm" tone="neutral">
            결과 화면에는 누가 답했는지 나오지 않아요. 연락이 필요한 문항만 예외이고, 그 문항에 미리 적혀 있어요.
          </Text>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 pt-0.5">
            <Icon name="check" size="sm" tone="neutral" />
          </span>
          <Text size="sm" tone="neutral">
            GitHub 계정은 한 설문에 한 번만 답하도록 확인하는 데 써요.
          </Text>
        </div>
      </div>
    </div>
  )
}
