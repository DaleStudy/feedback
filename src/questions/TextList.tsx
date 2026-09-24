import { useState } from 'react'
import { Button, Text } from 'daleui'

const PREVIEW = 3

// 서술·단답 결과. 처음에는 몇 개만 보여 주고 나머지는 펼쳐서 본다.
export function TextList({ values }: { values: string[] }) {
  const [open, setOpen] = useState(false)
  if (values.length === 0) {
    return (
      <Text size="sm" tone="neutral" muted>
        아직 답이 없어요
      </Text>
    )
  }
  const shown = open ? values : values.slice(0, PREVIEW)
  return (
    <div className="flex flex-col">
      <ul className="flex flex-col">
        {shown.map((v, i) => (
          <li key={i} className="border-t border-[var(--colors-border-neutral)] py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
            {v}
          </li>
        ))}
      </ul>
      {values.length > PREVIEW && (
        <div className="pt-2">
          <Button tone="brand" variant="ghost" size="sm" onClick={() => setOpen(!open)}>
            {open ? '접기' : `${values.length - PREVIEW}개 더 보기`}
          </Button>
        </div>
      )}
    </div>
  )
}
