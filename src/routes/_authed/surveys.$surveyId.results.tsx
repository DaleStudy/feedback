import { Link, createFileRoute } from '@tanstack/react-router'
import { Heading, Text, VStack } from 'daleui'
import { getSurveyResults } from '@/server/functions/surveys'

export const Route = createFileRoute('/_authed/surveys/$surveyId/results')({
  loader: ({ params }) => getSurveyResults({ data: { surveyId: params.surveyId } }),
  component: ResultsPage,
})

const SCALE = ['1', '2', '3', '4', '5']

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
            {q.type === 'scale' && <Distribution values={q.values} options={SCALE} showAverage />}
            {q.type === 'choice' && <Distribution values={q.values} options={q.options ?? []} />}
            {(q.type === 'short' || q.type === 'long') &&
              (q.values.length === 0 ? (
                <Text size="sm" tone="neutral" muted>
                  응답 없음
                </Text>
              ) : (
                <ul className="space-y-2">
                  {q.values.map((v, i) => (
                    <li key={i} className="whitespace-pre-wrap rounded border border-gray-200 bg-white px-3 py-2 text-sm">
                      {v}
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </section>
      ))}

      <Link to="/" className="text-sm text-blue-600 underline">
        홈으로
      </Link>
    </VStack>
  )
}

function Distribution({ values, options, showAverage }: { values: string[]; options: string[]; showAverage?: boolean }) {
  const counts = new Map(options.map((o) => [o, 0]))
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const max = Math.max(1, ...counts.values())
  const average = showAverage && values.length ? values.reduce((sum, v) => sum + Number(v), 0) / values.length : null

  return (
    <div>
      {average !== null && (
        <Text size="sm" weight="bold" className="mb-2">
          평균 {average.toFixed(1)}
        </Text>
      )}
      <table className="w-full text-sm">
        <tbody>
          {options.map((o) => {
            const n = counts.get(o) ?? 0
            return (
              <tr key={o}>
                <td className="w-32 py-1 pr-3 align-middle">{o}</td>
                <td className="py-1">
                  <div className="h-4 rounded bg-blue-500" style={{ width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0 }} />
                </td>
                <td className="w-10 py-1 pl-3 text-right tabular-nums text-gray-500">{n}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
