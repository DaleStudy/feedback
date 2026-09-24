import { HeadContent, Link, Scripts, createRootRoute, useLocation, useMatches, useRouter } from '@tanstack/react-router'
import { Button, HStack, Heading, Link as DaleLink, Text } from 'daleui'
import { AppLink } from '@/components/AppLink'
import { Logo } from '@/components/Logo'
import { getCurrentUser, logout } from '@/server/functions/auth'
import { SITE_NAME, SITE_URL, pageHead } from '@/lib/seo'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => ({ user: await getCurrentUser() }),
  head: () => {
    const home = pageHead({ path: '/' })
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Discord 임베드 왼쪽 띠 색, 모바일 브라우저 주소창 색
        { name: 'theme-color', content: '#5333e1' },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'ko_KR' },
        { property: 'og:image', content: `${SITE_URL}/og.jpg` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: '코드 마크가 그려진 설문 클립보드와 별점·하트·웃는 얼굴 말풍선' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: `${SITE_URL}/og.jpg` },
        // 페이지가 따로 정하지 않으면 홈의 제목·설명을 쓴다
        ...home.meta,
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    }
  },
  notFoundComponent: () => (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Heading level={1}>404</Heading>
      <Text tone="neutral">페이지를 찾을 수 없어요.</Text>
      <AppLink to="/" tone="brand">
        홈으로 돌아가기
      </AppLink>
    </div>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const bare = useMatches({ select: (matches) => matches.some((m) => m.staticData?.bare) })
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        {bare ? (
          children
        ) : (
          <>
            <SiteHeader />
            <main className="mx-auto w-full max-w-[1040px] px-4 py-12">{children}</main>
            <footer className="mt-12 border-t border-[var(--colors-border-neutral)] py-8">
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
          </>
        )}
        <Scripts />
      </body>
    </html>
  )
}

function SiteHeader() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const pathname = useLocation({ select: (l) => l.pathname })

  const handleLogout = async () => {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <header className="border-b border-[var(--colors-border-neutral)]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 whitespace-nowrap md:gap-10 md:px-10">
        <Link to="/" aria-label="달레 스터디 피드백 홈" className="flex items-center gap-2.5 no-underline">
          <Logo />
          <Text size="lg" weight="bold" tone="neutral">
            달레 스터디 피드백
          </Text>
        </Link>
        {user?.canManage && (
          <nav aria-label="주 메뉴" className="flex gap-6 self-stretch">
            <NavTab to="/manage" active={pathname.startsWith('/manage')}>
              관리
            </NavTab>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden sm:inline">
                <Text size="sm" tone="neutral">
                  @{user.login}
                </Text>
              </span>
              <Button variant="ghost" size="sm" tone="neutral" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <DaleLink href="/login" size="sm" tone="brand">
              GitHub로 로그인
            </DaleLink>
          )}
        </div>
      </div>
    </header>
  )
}

function NavTab({ to, active, children }: { to: '/manage'; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`-mb-px flex items-center border-b-2 ${active ? 'border-[var(--colors-bg-solid-brand)]' : 'border-transparent'}`}>
      <AppLink to={to} tone={active ? 'brand' : 'neutral'} underline={false}>
        {children}
      </AppLink>
    </div>
  )
}
