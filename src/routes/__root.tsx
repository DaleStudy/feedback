import { HeadContent, Link, Scripts, createRootRoute, useRouter } from '@tanstack/react-router'
import { Button, HStack, Link as DaleLink, Text } from 'daleui'
import { getCurrentUser, logout } from '@/server/functions/auth'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => ({ user: await getCurrentUser() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '달레 스터디 피드백' },
      { property: 'og:site_name', content: '달레 스터디 피드백' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: '달레 스터디 피드백' },
      { property: 'og:description', content: '스터디 피드백을 한곳에 모읍니다' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>',
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="mt-6 inline-block text-blue-600 underline">
        홈으로 돌아가기
      </Link>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              달레 스터디 피드백
            </Link>
            {user ? (
              <HStack gap="12" align="center">
                <Text size="sm" tone="neutral">
                  @{user.login}
                </Text>
                <Button variant="ghost" size="sm" tone="neutral" onClick={handleLogout}>
                  로그아웃
                </Button>
              </HStack>
            ) : (
              <a href="/login" className="text-sm text-blue-600 underline">
                GitHub로 로그인
              </a>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <footer className="mt-12 border-t py-8">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <HStack gap="16" className="mb-3 justify-center">
              <DaleLink href="https://www.dalestudy.com/" external size="sm" tone="neutral">
                DaleStudy
              </DaleLink>
              <DaleLink href="https://github.com/DaleStudy/feedback" external size="sm" tone="neutral">
                GitHub
              </DaleLink>
            </HStack>
            <Text size="xs" tone="neutral">
              &copy; {new Date().getFullYear()} DaleStudy. All rights reserved.
            </Text>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
