import { describe, expect, test } from 'bun:test'
import { closesAtToKstDate, dday, formatDeadline, isClosed, kstDateToClosesAt } from './kst'

describe('마감 날짜 ↔ ISO', () => {
  test('날짜는 그날 23:59:59 KST 가 된다', () => {
    expect(kstDateToClosesAt('2026-09-30')).toBe('2026-09-30T14:59:59.000Z')
    expect(kstDateToClosesAt('')).toBeNull()
  })

  test('ISO 는 KST 기준 날짜로 돌아온다 (UTC 날짜가 하루 앞서도)', () => {
    expect(closesAtToKstDate('2026-09-30T14:59:59.000Z')).toBe('2026-09-30')
    expect(closesAtToKstDate('2026-09-30T15:00:00.000Z')).toBe('2026-10-01')
    expect(closesAtToKstDate(null)).toBe('')
  })
})

describe('마감 표시', () => {
  const closesAt = '2026-09-30T14:59:59.000Z' // 9월 30일 23:59:59 KST

  test('KST 로 날짜와 시각을 쓴다', () => {
    expect(formatDeadline(closesAt)).toBe('9월 30일 23:59')
  })

  test('남은 날은 KST 달력으로 센다', () => {
    expect(dday(closesAt, new Date('2026-09-22T03:00:00Z'))).toBe('D-8')
    // UTC 로는 29일이지만 KST 로는 이미 30일 아침
    expect(dday(closesAt, new Date('2026-09-29T23:30:00Z'))).toBe('D-day')
    expect(dday(closesAt, new Date('2026-09-30T15:00:00Z'))).toBeNull()
  })

  test('isClosed 는 마감 시각이 지나야 참이다', () => {
    expect(isClosed(null)).toBe(false)
    expect(isClosed(closesAt, new Date('2026-09-30T14:59:58Z'))).toBe(false)
    expect(isClosed(closesAt, new Date('2026-09-30T15:00:00Z'))).toBe(true)
  })
})
