import { Text } from 'daleui'

// 보기별 응답 수를 가로 막대로. scale 과 choice 의 결과 화면이 같이 쓴다.
export function Distribution({ values, options, showAverage }: { values: string[]; options: string[]; showAverage?: boolean }) {
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
