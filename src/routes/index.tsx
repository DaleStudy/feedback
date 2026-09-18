import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, Heading, Tag, Text, VStack } from 'daleui'
import { listMySurveys } from '@/server/functions/surveys'

export const Route = createFileRoute('/')({
  loader: ({ context }) => (context.user ? listMySurveys() : null),
  component: HomePage,
})

function HomePage() {
  const mine = Route.useLoaderData()

  if (!mine) {
    return (
      <VStack align="stretch" gap="16">
        <Heading level={1}>스터디 피드백</Heading>
        <Text tone="neutral">
          달레 스터디의 모든 스터디 피드백을 한곳에 모읍니다. 참가 중인 스터디의 설문을 보려면 GitHub로
          로그인하세요.
        </Text>
        <a href="/login" className="inline-block w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          GitHub로 로그인
        </a>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap="32">
      <section>
        <Heading level={2} size={3}>
          답할 설문
        </Heading>
        {mine.toAnswer.length === 0 ? (
          <Text tone="neutral" muted>
            지금 답할 설문이 없습니다.
          </Text>
        ) : (
          <VStack align="stretch" gap="12" className="mt-4">
            {mine.toAnswer.map((s) => (
              <Card key={s.id} outline>
                <Card.Body>
                  <Card.Title>
                    <Link to="/surveys/$surveyId" params={{ surveyId: s.id }} className="hover:underline">
                      {s.title}
                    </Link>
                  </Card.Title>
                  <Card.Description>
                    {s.studyName} {s.cohortName} · {s.anonymous ? '익명' : '실명'}
                    {s.closesAt ? ` · ${new Date(s.closesAt).toLocaleDateString('ko-KR')} 마감` : ''}
                  </Card.Description>
                  {s.answered && <Tag tone="success">응답 완료</Tag>}
                  {!s.answered && s.closed && <Tag tone="neutral">마감</Tag>}
                </Card.Body>
              </Card>
            ))}
          </VStack>
        )}
      </section>

      {mine.toReview.length > 0 && (
        <section>
          <Heading level={2} size={3}>
            결과 보기
          </Heading>
          <VStack align="stretch" gap="12" className="mt-4">
            {mine.toReview.map((s) => (
              <Card key={s.id} outline>
                <Card.Body>
                  <Card.Title>
                    <Link to="/surveys/$surveyId/results" params={{ surveyId: s.id }} className="hover:underline">
                      {s.title}
                    </Link>
                  </Card.Title>
                  <Card.Description>
                    {s.studyName} {s.cohortName} · {s.anonymous ? '익명' : '실명'}
                  </Card.Description>
                </Card.Body>
              </Card>
            ))}
          </VStack>
        </section>
      )}
    </VStack>
  )
}
