import { Text } from 'daleui'

// 서술형 답변 목록. short 와 long 의 결과 화면이 같이 쓴다.
export function TextList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return (
      <Text size="sm" tone="neutral" muted>
        응답 없음
      </Text>
    )
  }
  return (
    <ul className="space-y-2">
      {values.map((v, i) => (
        <li key={i} className="whitespace-pre-wrap rounded border border-gray-200 bg-white px-3 py-2 text-sm">
          {v}
        </li>
      ))}
    </ul>
  )
}
