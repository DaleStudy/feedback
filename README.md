# 📝 달레 스터디 피드백

스터디 참가자 피드백을 한곳에 모으는 사이트. https://feedback.dalestudy.com

스터디 리더마다 다른 도구로 피드백을 받다 보니 지난 기수 피드백을 찾기도, 기수 간 비교도 어려웠다.
GitHub 로그인으로 누가 답할 수 있는지만 확인하고, 응답은 익명으로 D1 에 쌓는다.

## 구조

- **TanStack Start** (React) on **Cloudflare Workers**
- **D1** (SQLite) + **Drizzle**
- **daleui** 디자인 시스템
- 로그인: DaleStudy GitHub App 의 user-to-server OAuth

```
studies ─┬─ cohorts ─┬─ participants (cohort_id, login)   ← 설문에 답할 수 있는 사람
         │           └─ surveys ─ questions
         │                   └─ responses ─ answers
         └─ leaders (study_id, login)                     ← 결과를 볼 수 있는 사람
```

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

관리 화면은 아직 없다. `seed/example.json` 형식으로 JSON 을 쓰고 넣는다.

```bash
bun run db:seed:local seed/blog-2-final.json
bun run db:seed:remote seed/blog-2-final.json
```

스터디·기수·리더·참가자는 이미 있으면 건너뛰고, 설문은 같은 id 가 있으면 실패한다.
질문 유형은 `scale`(1~5), `short`, `long`, `choice`(`options` 필요) 네 가지.

### 스키마 바꾸기

```bash
# src/db/schema.ts 수정 후
bunx drizzle-kit generate --name <설명>
bun run db:migrate:local
```

## 배포

처음 한 번:

```bash
bunx wrangler d1 create feedback --location apac   # 나온 database_id 를 wrangler.jsonc 에
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put HMAC_SECRET
bun run db:migrate:remote
```

이후는 Cloudflare 대시보드의 Workers Builds 로 `main` push 시 자동 배포. `bun run deploy` 는 수동 fallback.
GitHub App 의 Callback URL 에 `https://feedback.dalestudy.com/auth/callback` 도 등록한다.
