# 📝 달레 스터디 피드백

스터디 참가자 피드백을 한곳에 모으는 사이트. https://feedback.dalestudy.com

스터디 리더마다 다른 도구로 피드백을 받다 보니 지난 기수 피드백을 찾기도, 기수 간 비교도 어려웠다.
GitHub 로그인으로 중복 응답만 막고, 응답은 익명으로 D1 에 쌓는다.

## 구조

- **TanStack Start** (React) on **Cloudflare Workers**
- **D1** (SQLite) + **Drizzle**
- **daleui** 디자인 시스템
- 로그인: DaleStudy GitHub App 의 user-to-server OAuth

```
studies ─┬─ cohorts ─ surveys ─ questions
         │                 └─ responses ─ answers
         └─ leaders (study_id, login)      ← 결과를 볼 수 있는 사람
```

참가자 명단은 두지 않는다. 설문 링크는 해당 스터디 채널에만 공유되고, 답하려면 GitHub 로그인이 필요하며,
같은 사람의 중복 응답은 막히므로 명단이 주는 추가 안전이 Discord↔GitHub 매핑을 유지하는 비용보다 작다.

익명 설문의 `responses.respondent_key` 는 `HMAC(HMAC_SECRET, surveyId:userId)` 다.
같은 사람의 중복 응답만 막고, 누가 답했는지는 리더도 서버도 복원할 수 없다. 실명 설문이면 GitHub login 을 그대로 쓴다.

## 개발

```bash
bun install
bun run cf-typegen          # wrangler.jsonc 바뀔 때마다
bun run db:migrate:local
bun run db:seed:local seed/example.json
bun run dev                 # http://localhost:3000
```

로컬 시크릿은 `.dev.vars` 에 둔다 (git 에 올라가지 않음).

```
GITHUB_CLIENT_ID=...        # DaleStudy GitHub App 의 Client ID
GITHUB_CLIENT_SECRET=...    # 같은 앱의 Client secret
HMAC_SECRET=...             # openssl rand -hex 32
```

GitHub App 설정의 Callback URL 에 `http://localhost:3000/auth/callback` 이 등록돼 있어야 한다.
`__Host-` 접두사 쿠키는 Secure 가 필수라 로컬 개발은 localhost 를 secure context 로 취급하는 Chrome/Firefox 에서 한다.

### 설문 만들기

관리 화면은 아직 없다. `seed/` 에 JSON 을 쓰고 넣는다. `seed/blog01-final.json` 이 실제 예, `seed/example.json` 이 형식 설명이다.

```bash
bun run db:seed:local seed/blog01-final.json
bun run db:seed:remote seed/blog01-final.json
```

스터디·기수·리더는 이미 있으면 건너뛰고, 설문은 같은 id 가 있으면 실패한다.

문항은 두 종류다.

- `{ "common": "goal_achieved" }` — `src/questions/common.ts` 의 **공통 문항**. 모든 스터디가 같은 `key` 로 묻는다.
  문구 속 `{activity}`, `{artifact}` 는 설문의 `vars` 로 채운다 (블로그: "매주 글을 쓰는 데" / "글", 리트코드: "매주 문제를 푸는 데" / "풀이").
  기수·스터디 간 비교는 이 `key` 로 한다. 공통 문항 문구를 고치면 이전 기수와 비교가 깨지므로 신중히.
- `{ "type": "long", "label": "…" }` — 이 설문만의 문항. `key` 는 비어 있다.

둘 다 `required`(기본 true)와 `config` 를 줄 수 있다. `config` 의 모양은 유형이 정한다.

| type | 뜻 | config |
|---|---|---|
| `scale` | 숫자 척도 | `min`(1), `max`(5), `minLabel`("전혀 아니다"), `maxLabel`("매우 그렇다") |
| `short` | 한 줄 | — |
| `long` | 여러 줄 | — |
| `choice` | 단일 선택 | `options: string[]` (필수) |

### 문항 유형 추가하기

1. `src/db/schema.ts` 의 `questionTypes` 에 이름을 넣는다.
2. `src/questions/types/<이름>.tsx` 에 `QuestionTypeDef` 를 만든다 — `defaultConfig`(설정 스키마 겸 기본값), `validate`, `Input`(응답 화면), `Result`(결과 화면).
3. `src/questions/registry.tsx` 에 등록한다. 빠지면 타입 오류가 난다.

서버 함수와 라우트는 registry 만 보므로 다른 곳은 고칠 게 없다.

### 스키마 바꾸기

```bash
# src/db/schema.ts 수정 후
bunx drizzle-kit generate --name <설명>
bun run db:migrate:local
```

## 배포

`main` 에 push 하면 Cloudflare Workers Builds 가 `bun run build` → `npx wrangler deploy` 를 실행한다.
다른 브랜치를 push 하면 프리뷰 빌드가 돈다. `bun run deploy` 는 자동 배포가 안 될 때의 수동 fallback.

이미 설정된 것 (다시 만들 필요 없음):

- D1 `feedback` (APAC) — id 는 `wrangler.jsonc` 에 있음
- 시크릿 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `HMAC_SECRET`
- 커스텀 도메인 `feedback.dalestudy.com` (`wrangler.jsonc` 의 `routes`)
- Workers Builds ↔ `DaleStudy/feedback` 연결. 빌드 변수 `BUN_VERSION=1.4.0` (빌드 이미지 기본 bun 1.2.15 는 lockfile v2 를 못 읽는다. 로컬 bun 을 올리면 같이 올린다)
- GitHub App Callback URL: `http://localhost:3000/auth/callback`, `https://feedback.dalestudy.com/auth/callback`

`HMAC_SECRET` 은 바꾸면 기존 익명 응답자의 중복 방지 키가 달라지므로 교체하지 않는다.
스키마가 바뀌면 배포 전에 `bun run db:migrate:remote` 를 직접 실행한다.
