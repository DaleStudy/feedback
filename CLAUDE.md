# CLAUDE.md

## Commands

```bash
bun run dev                 # Dev server on port 3000
bun run build
bun run test                # tsc --noEmit + bun test
bun run cf-typegen          # wrangler.jsonc 변경 후 worker-configuration.d.ts 재생성
bun run db:migrate:local    # 로컬 D1 마이그레이션
bun run db:seed:local <json># 설문 JSON 을 로컬 D1 에 넣기 (seed/example.json 참고)
bunx drizzle-kit generate --name <desc>   # 스키마 변경 후 마이그레이션 생성
```

## Architecture

**TanStack Start** on **Cloudflare Workers**, D1 + Drizzle, daleui. schedule 저장소와 같은 구성.

- `src/routes/` 파일 기반 라우팅. `login.tsx`, `auth.callback.tsx` 는 `server.handlers` 로 정의한 서버 라우트.
- `src/routes/_authed.tsx` 는 미로그인 사용자를 `/login` 으로 보내는 UX 가드일 뿐이다. **보안 경계는 서버 함수의 `authMiddleware`** (`src/server/auth/middleware.ts`). 데이터를 만지는 서버 함수에는 전부 붙인다.
- 서버 함수는 `createServerFn` + `.validator()` + `.handler()`. 바인딩은 `import { env } from 'cloudflare:workers'` — `env.DB`, 시크릿은 `env.GITHUB_CLIENT_ID` 등 (`src/env.d.ts` 에서 타입 보강).
- 세션은 D1 `sessions` 테이블의 opaque id 를 `__Host-session` HttpOnly 쿠키에 담는다. 30일.
- 익명 설문 응답자 키는 `src/server/respondent-key.ts` 의 HMAC. `HMAC_SECRET` 이 바뀌면 기존 응답자의 중복 방지가 풀리므로 바꾸지 않는다.
- 문항 유형은 `src/questions/registry.tsx` 에 모여 있다. 검증(`validateAnswer`)·응답 UI(`QuestionInput`)·결과 UI(`QuestionResult`)는 전부 registry 를 거친다. 유형별 `switch` 를 다른 곳에 만들지 않는다.
- 공통 문항은 `src/questions/common.ts`. `questions.key` 로 기수·스터디를 가로질러 같은 문항을 찾는다. 문구 변경은 곧 비교 단절이다.
- 설문 정의는 `seed/*.json` → `scripts/seed-survey.ts`. 관리 UI 없음.

## Gotchas

- **D1 파라미터 ~100개 제한**: 답변 일괄 INSERT 는 10행씩 청크. `submitResponse` 참고.
- **SQLite 마이그레이션**: 기존 테이블에 NOT NULL 컬럼을 DEFAULT 없이 추가할 수 없다.
- **TypeScript 7**: `baseUrl` 옵션이 사라졌다. `paths` 만 쓴다.
- **`.dev.vars` 변경은 dev 서버 재시작 필요.**
- daleui 에 `Textarea` 가 없어 `src/components/Textarea.tsx` 로 임시 대체. daleui 에 추가되면 교체.
- 로컬에서 GitHub 로그인 없이 인증 흐름을 확인하려면 `users` 와 `sessions` 에 행을 직접 넣고 `Cookie: __Host-session=<id>` 로 요청한다.
