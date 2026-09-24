import { createFileRoute } from '@tanstack/react-router'
import { Card, Heading, Icon, Link as DaleLink, Tag, Text } from 'daleui'
import { pageHead } from '@/lib/seo'
import { AppLink } from '@/components/AppLink'
import { dday, formatDeadline } from '@/lib/kst'
import { listMySurveys } from '@/server/functions/surveys'

export const Route = createFileRoute('/')({
  loader: ({ context }) => (context.user ? listMySurveys() : null),
  head: () => pageHead({ path: '/' }),
  component: HomePage,
})

type MySurvey = NonNullable<Awaited<ReturnType<typeof listMySurveys>>>[number]

function HomePage() {
  const surveys = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  if (!surveys || !user) {
    return (
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <Heading level={1} size={2}>
          피드백
        </Heading>
        <Text tone="neutral">
          달레 스터디의 스터디와 프로젝트 피드백을 한곳에 모읍니다. 참여 중인 프로그램에 피드백을 남기려면 GitHub로 로그인하세요.
        </Text>
        <DaleLink href="/login" tone="brand" size="lg">
          GitHub로 로그인
        </DaleLink>
      </div>
    )
  }

  const open = surveys.filter((s) => !s.answered && !s.closed)
  // 한 목록에 둔다: 답할 설문 → 마감돼 놓친 설문(놓쳤다는 걸 알 수 있게) → 완료한 설문
  const ordered = [...open, ...surveys.filter((s) => !s.answered && s.closed), ...surveys.filter((s) => s.answered)]

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-12">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Text tone="neutral">안녕하세요, @{user.login} 님</Text>
          <Heading level={1} size={2}>
            {open.length
              ? `진행 중인 설문이 ${open.length}개 있어요`
              : ordered.some((s) => s.answered)
                ? '모든 설문에 답했어요'
                : '지금 진행 중인 설문이 없어요'}
          </Heading>
        </div>
        {ordered.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
        {ordered.length === 0 && (
          <Text tone="neutral" muted>
            새 설문이 열리면 여기에 보여요. 설문 링크는 프로그램 채널에 공유돼요.
          </Text>
        )}
      </section>
    </div>
  )
}

function SurveyCard({ survey }: { survey: MySurvey }) {
  return (
    <Card tone="neutral" outline>
      {(survey.answered || survey.closed || survey.closesAt) && (
        <div className="flex w-full justify-end">
          {survey.answered ? (
            <Tag tone="success">응답 완료</Tag>
          ) : survey.closed ? (
            <Tag tone="neutral">마감</Tag>
          ) : (
            survey.closesAt && (
              <Text size="sm" weight="semibold" tone="brand">
                {dday(survey.closesAt)} · {formatDeadline(survey.closesAt)} 마감
              </Text>
            )
          )}
        </div>
      )}
      <Card.Body>
        <Heading level={2} size={4}>
          {survey.title}
        </Heading>
      </Card.Body>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <Icon name="clock" size="sm" tone="neutral" />
            <Text size="sm" tone="neutral">
              약 {survey.minutes}분 · {survey.questionCount}문항
            </Text>
          </div>
        </div>
        {!survey.answered && !survey.closed && (
          <AppLink to="/$surveyId" params={{ surveyId: survey.id }} tone="brand" size="lg" underline={false}>
            시작하기 <Icon name="chevronRight" size="sm" tone="brand" />
          </AppLink>
        )}
      </div>
    </Card>
  )
}
