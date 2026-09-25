import type { Visibility } from '@/db/schema'

// 공개 범위의 이름과 아이콘. 관리 목록과 편집 화면 설정이 같은 말을 쓴다.
export const VISIBILITY: Record<Visibility, { label: string; detail: string; icon: 'globe' | 'eyeOff' | 'users' }> = {
  home: { label: '홈에 보임', detail: '로그인한 누구나 홈에서 찾을 수 있어요', icon: 'globe' },
  link: { label: '링크로만', detail: '홈에는 안 보이고 링크로 들어와요', icon: 'eyeOff' },
  invited: { label: '지정한 사람만', detail: '지정한 사람과 팀의 홈에만 보이고, 그 사람들만 답할 수 있어요', icon: 'users' },
}
