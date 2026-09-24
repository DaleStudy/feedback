// 표를 CSV 글자로. 쉼표·따옴표·줄바꿈이 든 칸은 따옴표로 감싸고, 엑셀이 한글을 알아보도록 BOM 을 붙인다.
export function toCsv(rows: string[][]) {
  const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}`
}
