import { Text } from 'daleui'

// 결과 화면의 숫자형 그림. scale 은 한 줄짜리 분포 막대, choice 는 보기별 비율 막대.

export function average(values: string[]) {
  return values.length ? values.reduce((sum, v) => sum + Number(v), 0) / values.length : null
}

// values 중 option 을 고른 비율(0~100, 반올림)
export function share(values: string[], option: string) {
  return values.length ? Math.round((values.filter((v) => v === option).length / values.length) * 100) : null
}

// 낮은 점수는 옅게, 높은 점수는 진하게. 브랜드 색을 배경과 섞는다.
function shade(step: number, steps: number) {
  const pct = Math.round(14 + (86 * step) / Math.max(1, steps - 1))
  return `color-mix(in srgb, var(--colors-bg-solid-brand) ${pct}%, var(--colors-app-bg))`
}

export function ScaleDistribution({
  values,
  steps,
  minLabel,
  maxLabel,
}: {
  values: string[]
  steps: string[]
  minLabel: string
  maxLabel: string
}) {
  const avg = average(values)
  const counts = steps.map((s) => values.filter((v) => v === s).length)

  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 grow flex-col gap-2">
        <div className="flex h-8 overflow-hidden rounded-[var(--radii-md)] bg-[var(--colors-bg-neutral)]">
          {counts.map((n, i) =>
            n ? (
              <div
                key={steps[i]}
                title={`${steps[i]}점 ${n}명`}
                className="flex items-center justify-center text-[13px] font-semibold"
                style={{
                  width: `${(n / values.length) * 100}%`,
                  background: shade(i, steps.length),
                  color: i >= (steps.length * 3) / 5 ? 'var(--colors-fg-solid-brand)' : 'var(--colors-fg-neutral)',
                }}
              >
                {n}명
              </div>
            ) : null,
          )}
        </div>
        <div className="flex justify-between">
          <Text size="xs" tone="neutral" muted>
            {steps[0]} · {minLabel}
          </Text>
          <Text size="xs" tone="neutral" muted>
            {steps.at(-1)} · {maxLabel}
          </Text>
        </div>
      </div>
      <div className="flex w-20 shrink-0 flex-col items-end gap-0.5">
        <span className="text-[32px] leading-none font-bold tabular-nums">{avg === null ? '–' : avg.toFixed(1)}</span>
        <Text size="xs" tone="neutral" muted>
          평균 / {steps.at(-1)}
        </Text>
      </div>
    </div>
  )
}

export function ChoiceDistribution({ values, options }: { values: string[]; options: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o, i) => {
        const n = values.filter((v) => v === o).length
        const pct = share(values, o) ?? 0
        return (
          <div key={o} className="grid grid-cols-[minmax(3rem,auto)_minmax(0,1fr)_5.5rem] items-center gap-3">
            <Text size="sm" weight="medium" tone="neutral">
              {o}
            </Text>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--colors-bg-neutral)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: i === 0 ? 'var(--colors-bg-solid-brand)' : 'var(--colors-bg-solid-neutral-disabled)' }}
              />
            </div>
            <span className="text-right text-sm tabular-nums">
              {pct}% · {n}명
            </span>
          </div>
        )
      })}
    </div>
  )
}
