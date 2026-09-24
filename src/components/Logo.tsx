import { useId } from 'react'

// 달레 스터디의 `</>` 마크. dalestudy.com 의 Logo.tsx 와 같은 모양·색이다.
// 한 페이지에 여러 번 그려질 수 있어 그라데이션 id 를 인스턴스마다 따로 만든다.
export function Logo({ width = 34, height = 15 }: { width?: number; height?: number }) {
  const gradient = useId()
  return (
    <svg width={width} height={height} viewBox="0 0 46 19" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={gradient} x1="-1" y1="9.5" x2="46" y2="9.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#24EACA" />
          <stop offset="1" stopColor="#846DE9" />
        </linearGradient>
      </defs>
      <path d="M12 2 4 9.5 12 17" stroke={`url(#${gradient})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26.5 1 19.5 18" stroke={`url(#${gradient})`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M34 2 42 9.5 34 17" stroke={`url(#${gradient})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
