// 마감은 날짜만 받고 그날 23:59:59 KST 로 저장한다 (seed 관례: 2026-09-30T14:59:59.000Z).
// 화면에 보여줄 때도 KST 로 계산하므로 SSR(UTC) 과 브라우저가 같은 글자를 그린다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const toKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS)

export function kstDateToClosesAt(date: string) {
  return date ? new Date(`${date}T23:59:59+09:00`).toISOString() : null
}

export function closesAtToKstDate(iso: string | null) {
  return iso ? toKst(iso).toISOString().slice(0, 10) : ''
}

export function isClosed(closesAt: string | null, now = new Date()) {
  return closesAt !== null && closesAt < now.toISOString()
}

// "9월 30일 23:59"
export function formatDeadline(iso: string) {
  const d = toKst(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${hh}:${mm}`
}

// KST 달력 기준으로 남은 날. 마감 당일은 0, 지났으면 null.
export function daysLeft(iso: string, now = new Date()) {
  if (isClosed(iso, now)) return null
  return Math.round((Date.parse(closesAtToKstDate(iso)) - Date.parse(closesAtToKstDate(now.toISOString()))) / DAY_MS)
}

export function dday(iso: string, now = new Date()) {
  const days = daysLeft(iso, now)
  return days === null ? null : days === 0 ? 'D-day' : `D-${days}`
}
