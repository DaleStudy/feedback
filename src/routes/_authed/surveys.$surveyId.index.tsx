import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Heading, RadioGroup, Text, TextInput, VStack } from 'daleui'
import { Textarea } from '@/components/Textarea'
import { getSurvey, submitResponse } from '@/server/functions/surveys'

export const Route = createFileRoute('/_authed/surveys/$surveyId/')({
  loader: ({ params }) => getSurvey({ data: { surveyId: params.surveyId } }),
  component: SurveyPage,
})

const SCALE = ['1', '2', '3', '4', '5']

function SurveyPage() {
  const survey = Route.useLoaderData()
  const router = useRouter()
  const [values, setValues] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (questionId: number, value: string) => setValues((v) => ({ ...v, [questionId]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await submitResponse({
        data: {
          surveyId: survey.id,
          answers: Object.entries(values).map(([questionId, value]) => ({ questionId: Number(questionId), value })),
        },
      })
      await router.invalidate()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <VStack align="stretch" gap="8">
      <Heading level={1}>{survey.title}</Heading>
      {survey.description && <Text tone="neutral">{survey.description}</Text>}
      <Text size="sm" tone="neutral" muted>
        {survey.anonymous
          ? '익명 설문입니다. 누가 답했는지는 저장되지 않으며, 중복 응답만 막습니다.'
          : '실명 설문입니다. GitHub 계정과 함께 저장됩니다.'}
      </Text>
    </VStack>
  )

  if (survey.answered) {
    return (
      <VStack align="stretch" gap="24">
        {header}
        <Text tone="success">이미 응답하셨습니다. 감사합니다!</Text>
        <BackLinks canReview={survey.canReview} surveyId={survey.id} />
      </VStack>
    )
  }

  if (survey.closed || !survey.canAnswer) {
    return (
      <VStack align="stretch" gap="24">
        {header}
        <Text tone="neutral">{survey.closed ? '마감된 설문입니다.' : '이 설문의 응답 대상이 아닙니다.'}</Text>
        <BackLinks canReview={survey.canReview} surveyId={survey.id} />
      </VStack>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch" gap="32">
        {header}
        {survey.questions.map((q) => {
          const value = values[q.id] ?? ''
          switch (q.type) {
            case 'scale':
              return (
                <RadioGroup
                  key={q.id}
                  name={`q${q.id}`}
                  label={q.label}
                  orientation="horizontal"
                  required={q.required}
                  hint="1 = 전혀 아니다 · 5 = 매우 그렇다"
                  value={value}
                  onChange={(v) => set(q.id, v)}
                >
                  {SCALE.map((n) => (
                    <RadioGroup.Item key={n} value={n}>
                      {n}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup>
              )
            case 'choice':
              return (
                <RadioGroup
                  key={q.id}
                  name={`q${q.id}`}
                  label={q.label}
                  required={q.required}
                  value={value}
                  onChange={(v) => set(q.id, v)}
                >
                  {(q.options ?? []).map((opt) => (
                    <RadioGroup.Item key={opt} value={opt}>
                      {opt}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup>
              )
            case 'short':
              return (
                <TextInput
                  key={q.id}
                  label={q.label}
                  required={q.required}
                  value={value}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )
            case 'long':
              return (
                <Textarea key={q.id} label={q.label} required={q.required} value={value} onChange={(v) => set(q.id, v)} />
              )
          }
        })}
        {error && <Text tone="danger">{error}</Text>}
        <Button type="submit" loading={submitting}>
          제출
        </Button>
      </VStack>
    </form>
  )
}

function BackLinks({ canReview, surveyId }: { canReview: boolean; surveyId: string }) {
  return (
    <div className="flex gap-4 text-sm">
      <Link to="/" className="text-blue-600 underline">
        홈으로
      </Link>
      {canReview && (
        <Link to="/surveys/$surveyId/results" params={{ surveyId }} className="text-blue-600 underline">
          결과 보기
        </Link>
      )}
    </div>
  )
}
