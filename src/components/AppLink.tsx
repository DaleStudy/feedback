import { type LinkComponent, createLink } from '@tanstack/react-router'
import { Link } from 'daleui'

const RouterLink = createLink(Link)

// 달레 UI 링크의 모양으로 라우터 이동. 라우터 기본 activeProps(className 'active')가 달레 UI 클래스를 덮어써서 비운다.
export const AppLink: LinkComponent<typeof Link> = (props) => <RouterLink activeProps={{}} {...props} />
