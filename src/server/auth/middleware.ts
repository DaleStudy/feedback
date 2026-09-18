import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { getSessionUser } from './current-user'

// 데이터를 만지는 서버 함수에는 전부 이 미들웨어를 붙인다.
// 라우트의 beforeLoad 는 UX용 가드일 뿐, 서버 함수는 URL로 직접 호출될 수 있다.
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await getSessionUser()
  if (!user) throw redirect({ to: '/login' })
  return next({ context: { user } })
})
