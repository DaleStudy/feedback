import { Link } from 'daleui'
import { linkParts } from '@/lib/linkify'

// 글 속의 주소를 새 탭으로 여는 링크로 그린다
export function LinkifiedText({ text }: { text: string }) {
  return linkParts(text).map((part, i) =>
    part.href ? (
      <Link key={i} href={part.href} external tone="brand">
        {part.text}
      </Link>
    ) : (
      part.text
    ),
  )
}
