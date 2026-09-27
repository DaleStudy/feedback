import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Heading, Icon, Select, Text, TextInput } from 'daleui'
import { pageHead } from '@/lib/seo'
import { AppLink } from '@/components/AppLink'
import { Textarea } from '@/components/Textarea'
import { createSurvey, listManagedSurveys } from '@/server/functions/manage'
import { getSurveyPreview } from '@/server/functions/surveys'

export const Route = createFileRoute('/_authed/new')({
  // ?from=<id>: 관리 목록의 "복제"에서 온다. 그 설문을 템플릿으로 고른 채 시작한다.
  validateSearch: (search: Record<string, unknown>): { from?: string } => (typeof search.from === 'string' ? { from: search.from } : {}),
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ deps }) => ({
    templates: (await listManagedSurveys()).surveys,
    initial: deps.from ? await getSurveyPreview({ data: { surveyId: deps.from } }).catch(() => null) : null,
  }),
  head: () => pageHead({ title: '새 설문', path: '/new', noindex: true }),
  component: NewSurveyPage,
})

// 제목과 설명만 받는다. 마감일은 만든 뒤 편집 화면에서 정한다.
// 템플릿(기존 설문)을 고르면 문항·공개 범위·변수·대상을 옮기고, 제목과 설명을 채워 둔다.
function NewSurveyPage() {
  const { user } = Route.useRouteContext()
  const { templates, initial } = Route.useLoaderData()
  const navigate = useNavigate()
  const [from, setFrom] = useState(initial?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user?.canCreateSurveys) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4">
        <Heading level={1} size={2}>
          새 설문
        </Heading>
        <Text tone="neutral">새 설문은 DaleStudy 운영진(maintainer 팀)이 만들 수 있어요. 팀에 들어간 뒤 다시 로그인하면 반영돼요.</Text>
        <AppLink to="/manage" tone="brand">
          설문 관리로
        </AppLink>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { id } = await createSurvey({ data: { title, description, from: from || undefined } })
      await navigate({ to: '/$surveyId/edit', params: { surveyId: id } })
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  const pickTemplate = async (id: string) => {
    setFrom(id)
    if (!id) return
    const source = await getSurveyPreview({ data: { surveyId: id } })
    setTitle(source.title)
    setDescription(source.description ?? '')
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading level={1} size={2}>
          새 설문
        </Heading>
        <Text tone="neutral">제목과 설명만 정하면 바로 문항을 넣을 수 있어요. 마감일 같은 설정은 다음 화면에서 바꿔요.</Text>
      </div>
      {templates.length > 0 && (
        <div className="flex flex-col gap-2">
          <Select label="템플릿" value={from} onChange={(e) => void pickTemplate(e.target.value)}>
            <option value="">빈 설문</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <Text size="sm" tone="neutral">
            {from
              ? '이 설문의 문항, 공개 범위, 공통 문항 변수, 대상을 그대로 가져와요. 응답과 마감일은 가져오지 않아요.'
              : '비슷한 설문을 전에 만들었다면 골라 보세요. 문항을 처음부터 넣지 않아도 돼요.'}
          </Text>
        </div>
      )}
      <TextInput label="제목" required placeholder="예: 블로그 스터디 2기 참여 회고" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea
        label="설명"
        rows={4}
        value={description}
        onChange={setDescription}
        placeholder="응답자가 시작 화면에서 읽는 안내예요. 왜 묻는지, 몇 분 걸리는지 적어 주세요."
      />
      <div className="flex items-center gap-2">
        <Icon name="info" size="sm" tone="neutral" />
        <Text size="sm" tone="neutral">
          링크 주소는 자동으로 만들어져요. 나중에 바뀌지 않아요.
        </Text>
      </div>
      {error && <Text tone="danger">{error}</Text>}
      <div className="flex items-center gap-4">
        <Button type="submit" tone="brand" size="lg" loading={submitting} disabled={!title.trim()}>
          {from ? '만들고 문항 확인하기' : '만들고 문항 넣기'} <Icon name="chevronRight" size="sm" />
        </Button>
        <AppLink to="/manage" tone="neutral">
          취소
        </AppLink>
      </div>
    </form>
  )
}
