// 글 속의 http(s) 주소를 링크 조각으로 나눈다. 설문 설명처럼 운영진이 적은 글에서 주소를 누를 수 있게 한다.
// 주소 끝에 붙은 문장부호(마침표·쉼표·닫는 괄호)는 링크에서 뺀다.
export type TextPart = { text: string; href?: string }

export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  // URL 에 쓸 수 있는 ASCII 문자까지만. "…#26)을" 처럼 한글이 바로 붙어도 주소에서 끊긴다.
  for (const m of text.matchAll(/https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g)) {
    const href = m[0].replace(/[.,;:!?)\]]+$/, '')
    const start = m.index
    if (start > last) parts.push({ text: text.slice(last, start) })
    parts.push({ text: href, href })
    last = start + href.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
