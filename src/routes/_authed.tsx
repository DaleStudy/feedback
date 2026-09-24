import { createFileRoute, redirect } from '@tanstack/react-router'

// 로그인 안 된 사용자를 /login 으로 보내는 UX 가드.
// 보안 경계는 서버 함수의 authMiddleware 가 담당한다.
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ href: `/login?redirect=${encodeURIComponent(location.href)}` })
    }
  },
})
