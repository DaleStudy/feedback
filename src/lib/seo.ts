// 검색·SNS 미리보기용 메타. 미리보기 봇은 절대 URL 만 믿으므로 사이트 주소를 박아 둔다.
export const SITE_URL = 'https://feedback.dalestudy.com'
export const SITE_NAME = '달레 스터디 피드백'
export const SITE_DESCRIPTION = '달레 스터디의 스터디와 프로젝트 피드백을 한곳에 모읍니다. 참가자는 피드백을 남기고, 운영진은 결과를 함께 봐요.'

// 페이지마다 달라지는 것: 제목·설명·주소·색인 여부. og:image 같은 공통 값은 __root 에 있다.
export function pageHead({ title, description = SITE_DESCRIPTION, path, noindex = false }: { title?: string; description?: string; path: string; noindex?: boolean }) {
  const url = SITE_URL + path
  return {
    meta: [
      { title: title ? `${title} · ${SITE_NAME}` : SITE_NAME },
      { name: 'description', content: description },
      { property: 'og:title', content: title ?? SITE_NAME },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: title ?? SITE_NAME },
      { name: 'twitter:description', content: description },
      // 설문·관리 화면은 검색에 나오지 않게 한다. 링크 미리보기는 그대로 뜬다
      ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}

// 설명을 미리보기 한 줄에 맞게 자른다 (줄바꿈은 공백으로)
export function summarize(text: string, max = 110) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}
