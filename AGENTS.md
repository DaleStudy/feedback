# AGENTS.md

달레 스터디 피드백 (https://feedback.dalestudy.com) — 스터디·프로젝트 회고 설문 사이트.

## Docs

- `docs/database.md` — 테이블, 관계, 제약, 마이그레이션 이력
- `docs/questions.md` — 문항 유형, `config`, 공통 문항과 `vars`, 유형 추가 절차

## Commands

```bash
bun install
bun run dev                 # Dev server on port 3000
bun run build
bun run test                # tsc --noEmit + bun test
bun run cf-typegen          # wrangler.jsonc 변경 후 worker-configuration.d.ts 재생성
bun run db:migrate:local    # 로컬 D1 마이그레이션
bun run db:seed:local <json># 설문 JSON(편집자·문항)을 로컬 D1 에 넣기 (seed/example.json 참고)
bunx drizzle-kit generate --name <desc>   # 스키마 변경 후 마이그레이션 생성
bun run db:migrate:remote   # 프로덕션 D1 마이그레이션 (아래 Gotchas 의 순서를 지킨다)
```

## Local setup

- 로컬 시크릿은 `.dev.vars` (git 에 올라가지 않음): `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — DaleStudy GitHub App 의 Client ID·secret.
- GitHub App 의 Callback URL 에 `http://localhost:3000/auth/callback` 이 등록돼 있어야 한다.
- `__Host-` 접두사 쿠키는 Secure 가 필수라, localhost 를 secure context 로 취급하는 Chrome/Firefox 에서 개발한다.
- seed JSON(`seed/*.json`, 형식은 `seed/example.json`): `editors` 가 편집자, `survey.id` 를 빼면 nanoid 로 만든다. 같은 id 가 있으면 실패한다. 문항은 `{ "common": "<key>", "required"? }`(공통 문항, 문구는 `vars` 로 채움) 또는 `{ "type", "label", "required"?, "config"? }`(이 설문만의 문항). 유형별 저장값·검증·`config` 는 `docs/questions.md`.

## Deployment

- `main` 에 push 하면 Cloudflare Workers Builds 가 `bun run build` → `npx wrangler deploy`. 빌드 결과는 커밋의 check run `Workers Builds: feedback` 으로 확인한다. `bun run deploy` 는 수동 fallback.
- 이미 설정된 것: D1 `feedback`(APAC, id 는 `wrangler.jsonc`), 시크릿 `GITHUB_CLIENT_ID`·`GITHUB_CLIENT_SECRET`, 커스텀 도메인(`wrangler.jsonc` 의 `routes`), 빌드 변수 `BUN_VERSION=1.4.0`(빌드 이미지 기본 bun 은 lockfile v2 를 못 읽는다. 로컬 bun 을 올리면 같이 올린다).
- GitHub App 의 Callback URL 은 localhost 와 `https://feedback.dalestudy.com/auth/callback` 둘 다. 앱은 **공개(public)** 여야 한다 — 비공개 앱은 소유 조직 멤버만 authorize 할 수 있어서 조직 밖 참가자가 GitHub 의 authorize 페이지에서 404 를 본다(우리 로그에는 안 남는다).
- 저장소를 새로 만들면 Workers Builds 연결이 끊긴다(대시보드에는 이름이 그대로 보여도). 대시보드에서 Disconnect → Connect 로 다시 잇는다.

## Architecture

**TanStack Start** on **Cloudflare Workers**, D1 + Drizzle, daleui. schedule 저장소와 같은 구성.

- `src/routes/` 파일 기반 라우팅. `login.tsx`, `auth.callback.tsx` 는 `server.handlers` 로 정의한 서버 라우트.
- `src/routes/_authed.tsx` 는 미로그인 사용자를 `/login` 으로 보내는 UX 가드일 뿐이다. **보안 경계는 서버 함수의 `authMiddleware`** (`src/server/auth/middleware.ts`). 데이터를 만지는 서버 함수에는 전부 붙인다. 예외는 `getSurveyPreview` 하나 — 로그인 전 소개와 SNS 미리보기용으로 제목·설명·마감만 준다.
- 서버 함수는 `createServerFn` + `.validator()` + `.handler()`. 바인딩은 `import { env } from 'cloudflare:workers'` — `env.DB`, 시크릿은 `env.GITHUB_CLIENT_ID` 등 (`src/env.d.ts` 에서 타입 보강).
- 세션은 D1 `sessions` 테이블의 opaque id 를 `__Host-session` HttpOnly 쿠키에 담는다. 30일.
- 응답자는 `responses.user_id`. 익명 모드는 없다 — GitHub 로 로그인해 답하는 설문을 익명이라 믿는 사람은 드물고, 익명 분기(HMAC 키·잠금·안내 문구)의 비용이 컸다. 실명이 부담스럽다는 의견이 나오면 다시 넣는다. 대신 결과 화면(`getSurveyResults`)은 누가 답했는지 돌려주지 않는다. 예외는 `questions.identified` 문항(운영진 모집처럼 연락해야 하는 문항)뿐이다.
- 문항 유형은 `src/questions/registry.tsx` 에 모여 있다. 검증(`validateAnswer`)·응답 UI(`QuestionInput`)·결과 UI(`QuestionResult`, 숫자형/서술형 구역 `resultSection`)·응답 화면의 동작(자동 넘김·조작 안내 `questionBehavior`, 예상 시간 `estimateMinutes`)은 전부 registry 를 거친다. 유형별 `switch` 를 다른 곳에 만들지 않는다.
- 응답 화면(`/$surveyId`)과 편집 화면(`/$surveyId/edit`)은 `staticData: { bare: true }` 로 사이트 헤더 없이 화면 전체를 쓴다 (`__root.tsx` 가 읽는다).
- 응답 화면은 로그인 가드(`_authed`) 밖에 있다. 로그인 전에는 소개와 로그인 링크를 보여 주고, SNS 미리보기 봇도 제목·설명을 읽는다. 링크 미리보기가 뜨려면 이 라우트를 가드 안으로 옮기면 안 된다.
- 메타 태그는 `src/lib/seo.ts` 의 `pageHead` 로. OG 이미지·트위터 카드 같은 공통 값은 `__root.tsx`, 페이지는 제목·설명·주소·`noindex` 만 정한다. 검색에 나오는 건 홈뿐이다. 정적 파일(`og.jpg`, `favicon.svg`)은 `public/`.
- 화면은 daleui 컴포넌트로 짠다. 라우터 이동이 필요한 링크는 `src/components/AppLink.tsx`(daleui `Link` + `createLink`). 색·간격은 `var(--colors-…)`, `var(--spacing-…)` 토큰.
- 화면 용어: 만들고·지우고·마감되는 양식은 **설문**, 참가자가 남기는 내용은 **피드백** ("피드백을 남기다", 사이트 이름). 코드·DB·URL 은 `survey`.
- 공통 문항은 `src/questions/common.ts`. `questions.key` 로 설문을 가로질러 같은 문항을 찾는다. 문구 변경은 곧 비교 단절이다.
- 설문은 기수·프로그램 없이 홀로 선다 — 설문끼리 비교에 필요한 건 공통 문항 `key` 뿐이고, 기수 표는 기수마다 seed 로 등록해야 하는 비용만 컸다. 새 설문은 DaleStudy `maintainer` 팀만 만든다 (로그인 때 확인해 `users.can_create_surveys`, `src/server/auth/github.ts` 의 `SURVEY_CREATORS`). 고치고 결과를 보는 사람은 `survey_editors` (`src/server/access.ts` 의 `isEditor`). 서버 함수는 `src/server/functions/manage.ts`, 입력 검증은 `src/server/survey-input.ts` 의 순수 함수에 모여 있고 seed 도 같은 함수를 쓴다.
- 공개 범위는 `surveys.visibility`. `home`·`link` 는 응답 자격이 따로 없다(링크 + GitHub 로그인 + 중복 방지). `invited` 는 `survey_invitees` 의 사람(login)·팀(slug)과 편집자만 홈에서 보고 답한다 (`src/server/access.ts` 의 `canRespond`, `invitedSurveyIds`). 팀은 로그인 때 받은 `users.teams` 로 맞춰 보므로 팀이 바뀌면 다시 로그인해야 한다. `invited` 는 운영진처럼 대상이 적고 GitHub 이름을 아는 설문에 쓴다. 참여 회고 같은 큰 설문에 참가자 명단은 두지 않는다 — 링크는 프로그램 채널에만 공유되고, Discord↔GitHub 매핑을 유지하는 비용이 명단이 주는 안전보다 크다(블로그 1기 24명 중 7명 매핑 실패).
- 설계를 바꾸면 이유를 PR 설명에 남기고, 지켜야 할 규칙이 생기면 이 문서의 해당 줄에 한 줄로 이유를 붙인다.

## Gotchas

- **D1 파라미터 ~100개 제한**: 답변·문항 일괄 INSERT 는 10행씩 청크. `submitResponse`, `saveQuestions` 참고.
- **마감된 설문은 고칠 수 없다** (`manage.ts` 의 `loadOpenSurvey`). 편집 화면은 관리 목록으로 돌려보내고, 수정 서버 함수는 거절한다. 관리 목록의 스위치로 다시 열면 풀린다.
- **응답이 1건이라도 있으면 문항·vars 는 잠긴다** (`manage.ts` 의 `locked`). `answers` 가 question id 를 참조해서다. 문항 저장은 전체 교체(delete + insert)라 잠금 전에만 허용한다.
- **SQLite 마이그레이션**: 기존 테이블에 NOT NULL 컬럼을 DEFAULT 없이 추가할 수 없다.
- **TypeScript 7**: `baseUrl` 옵션이 사라졌다. `paths` 만 쓴다.
- **`.dev.vars` 변경은 dev 서버 재시작 필요.**
- **drizzle-kit 이 만든 SQLite rename/재생성 SQL 은 D1 에서 깨질 수 있다.** 트랜잭션 안의 `PRAGMA foreign_keys=OFF` 가 무시된다. 생성된 SQL 을 읽고 네이티브 `ALTER TABLE … RENAME` 으로 바꿔 쓴 적이 두 번 있다 (`0004`, `0006`). rename 프롬프트는 add/drop 두 마이그레이션으로 나눠도 된다.
- **스키마 PR 은 머지 → 빌드 완료 확인 → `bun run db:migrate:remote` 를 바로.** 컬럼 추가는 코드보다 먼저 돌려도 되지만, 파괴적 마이그레이션은 새 코드가 배포된 뒤에 돌린다.
- daleui 에 `Textarea`·`Switch` 가 없어 `src/components/Textarea.tsx`·`Switch.tsx` 로 임시 대체. daleui 에 추가되면 교체.
- **Tailwind 의 base 레이어가 daleui 의 reset 레이어보다 뒤라** 그대로 두면 글꼴을 시스템 글꼴로 덮어쓴다. `src/styles.css` 의 `@theme` 에서 `--font-sans` 를 daleui 토큰으로 맞춘다.
- **daleui `Link` 는 `className` 을 받으면 자기 스타일 클래스를 버린다.** 라우터가 활성 링크에 넘기는 `className: 'active'` 때문에 `AppLink` 는 `activeProps` 를 비운다. daleui 컴포넌트에 `className` 을 넘길 일이 있으면 같은 문제를 의심한다.
- 로컬에서 GitHub 로그인 없이 인증 흐름을 확인하려면 `users` 와 `sessions` 에 행을 직접 넣고 `Cookie: __Host-session=<id>` 로 요청한다.

## Deferred

- **조직 멤버 게이트** — 로그인 시 DaleStudy 조직 멤버만 통과시키는 것. 지금 켜면 실제 참가자가 막힌다(블로그 1기 참가자 17명 중 7명이 조직 멤버가 아니다). 참여 절차에 조직 초대를 넣은 뒤 켠다. 앱에 members 권한이 있으니 로그인 콜백에서 `GET /user/memberships/orgs/DaleStudy` 로 확인하면 된다(`isTeamMember` 와 같은 자리).
- **daleui 갭** — `Textarea`·`Switch`(임시 구현), 결과·관리 화면에 쓸 `Table`, 설문 보기용 큰 선택 타일(지금은 `Button` 에 `role="radio"`), 라우터와 붙는 버튼 모양 링크, 아이콘 `plus`·`calendar`·`link`·`copy`. daleui 에 추가되면 교체한다.
- **Workers Builds watch paths** — 문서만 바뀐 커밋도 빌드가 돈다. `docs/**`, `*.md` 를 빼면 되지만 빌드가 1분이라 급하지 않다.
