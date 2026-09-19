import { Link, createFileRoute } from '@tanstack/react-router'
import { Heading, Text, VStack } from 'daleui'
import { QuestionResult } from '@/questions/registry'
import { getSurveyResults } from '@/server/functions/surveys'

export const Route = createFileRoute('/_authed/surveys/$surveyId/results')({
  loader: ({ params }) => getSurveyResults({ data: { surveyId: params.surveyId } }),
  component: ResultsPage,
})

function ResultsPage() {
  const result = Route.useLoaderData()

  return (
    <VStack align="stretch" gap="32">
      <VStack align="stretch" gap="8">
        <Heading level={1}>{result.title}</Heading>
        <Text tone="neutral">
          응답 {result.responseCount}건 · {result.anonymous ? '익명' : '실명'}
        </Text>
        {result.respondents && result.respondents.length > 0 && (
          <Text size="sm" tone="neutral" muted>
            응답자: {result.respondents.map((r) => `@${r}`).join(', ')}
          </Text>
        )}
      </VStack>

      {result.questions.map((q) => (
        <section key={q.id}>
          <Heading level={2} size={4}>
            {q.label}
          </Heading>
          <div className="mt-3">
            <QuestionResult question={q} values={q.values} />
          </div>
        </section>
      ))}

      <Link to="/" className="text-sm text-blue-600 underline">
        홈으로
      </Link>
    </VStack>
  )
}

