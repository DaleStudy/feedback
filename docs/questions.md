# 문항 (questions)

설문의 문항이 어떻게 정의되고, 저장되고, 검증되고, 그려지는지. 설문을 만들거나 유형을 추가하기 전에 읽는다.

## 한눈에

| type | 뜻 | 응답자에게 | 저장값 (`answers.value`) | 검증 | 결과 화면 |
|---|---|---|---|---|---|
| `scale` | 숫자 척도 | 가로로 놓인 라디오 `min`…`max`, 양끝 라벨 힌트 | `'1'`~`'5'` 같은 정수 문자열 | `min` 이상 `max` 이하의 정수 | 평균 + 값별 개수 막대 |
| `short` | 한 줄 서술 | 한 줄 입력 | 자유 문자열 | 없음 | 답변 목록 |
| `long` | 여러 줄 서술 | 여러 줄 입력 | 자유 문자열 | 없음 | 답변 목록 |
| `choice` | 단일 선택 | 세로로 놓인 라디오 | `options` 중 하나 그대로 | `options` 에 있는 값 | 보기별 개수 막대 |

모든 유형에 공통:

- `required` (기본 `true`) — 비어 있으면 제출이 거부된다. 비필수 문항의 빈 답은 저장하지 않는다.
- 값은 유형과 무관하게 항상 문자열로 저장한다. `scale` 의 평균은 결과 화면에서 `Number()` 로 계산한다.
- 검증은 서버(`submitResponse`)에서 한다. 화면의 `required` 속성은 편의일 뿐 보안 경계가 아니다.

## config

유형별 설정은 `questions.config` JSON 컬럼 하나에 담는다. 모양은 유형 정의의 `defaultConfig` 가 정하고, seed 에서 준 값은 그 위에 얹힌다. 즉 seed 에는 바꿀 값만 쓰면 된다.

### scale

| 키 | 기본값 | 뜻 |
|---|---|---|
| `min` | `1` | 최솟값 |
| `max` | `5` | 최댓값 |
| `minLabel` | `"전혀 아니다"` | `min` 쪽 힌트 |
| `maxLabel` | `"매우 그렇다"` | `max` 쪽 힌트 |

```json
{ "type": "scale", "label": "문제 난이도는 어땠나요?", "config": { "minLabel": "너무 쉬웠다", "maxLabel": "너무 어려웠다" } }
{ "type": "scale", "label": "추천 의향", "config": { "min": 0, "max": 10 } }
```

힌트는 `"1 = 전혀 아니다 · 5 = 매우 그렇다"` 형태로 문항 아래에 붙는다. 질문이 "얼마나 참여했나요" 처럼 동의/비동의 축이 아니면 라벨을 꼭 바꾼다.

### choice

| 키 | 기본값 | 뜻 |
|---|---|---|
| `options` | `[]` | 보기. 비어 있으면 아무 값도 통과하지 못하므로 사실상 필수 |

```json
{ "type": "choice", "label": "가장 도움이 된 것은?", "config": { "options": ["매주 마감", "다른 참가자의 글", "댓글과 반응"] } }
```

보기 문자열이 곧 저장값이다. 나중에 보기 문구를 고치면 이전 응답과 집계가 갈라진다.

### short, long

설정 없음.

## 공통 문항

모든 프로그램(스터디·프로젝트)이 같은 `key` 로 묻는 문항. `src/questions/common.ts` 에 있고, seed 에서는 `{ "common": "<key>" }` 로 가져온다. 기수·프로그램 간 비교는 `questions.key` 로 한다.

| key | type | 문항 | 비고 |
|---|---|---|---|
| `goal_achieved` | scale | 시작할 때 이 `{program}`에서 하고 싶었던 것을 얼마나 해냈나요? | |
| `effort_satisfied` | scale | `{activity}` 들인 노력에 스스로 만족하나요? | |
| `gave_back` | scale | 다른 참가자의 `{artifact}`을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요? | 라벨 "거의 안 했다 · 적극적으로 했다" |
| `highlight_lowlight` | long | `{period}` 잘한 것 하나와 아쉬운 것 하나를 적어주세요. | |
| `do_differently` | long | `{redo}` 무엇을 다르게 하시겠어요? | |
| `community_help` | long | 그렇게 하는 데 커뮤니티(운영진이나 다른 참가자)가 어떤 도움을 주면 좋을까요? | `do_differently` 바로 뒤에 둔다 |
| `rejoin` | choice | `{next}` 참여할 생각이 있나요? | 있다 / 조건이 맞으면 있다 / 없다 |
| `dropout` | long | 중간에 그만두셨다면, 그때 무엇이 달랐다면 계속할 수 있었을까요? | 비필수 |

설계 의도: 커뮤니티가 무엇을 해줬는지가 아니라 참가자가 자기 활동을 먼저 돌아보고(`goal_achieved` ~ `highlight_lowlight`), 다시 한다면 어떻게 할지 생각한 뒤(`do_differently`), 그것을 위해 커뮤니티가 도울 것을 묻는(`community_help`) 순서다. 요청이 남 탓이 아니라 본인 계획에 붙는 부탁이 되게 하려는 것이다.

### vars

자리표시자는 설문의 `vars` 로 채운다. 기수제 스터디와 상시 프로젝트는 시제가 달라서 `period`, `redo`, `next` 가 갈린다.

| var | 블로그 스터디 | 리트코드 스터디 | 달레 UI (상시 프로젝트) |
|---|---|---|---|
| `program` | 스터디 | 스터디 | 프로젝트 |
| `period` | 이번 기수에서 | 이번 기수에서 | 지난 반년 동안 |
| `activity` | 매주 글을 쓰는 데 | 매주 문제를 푸는 데 | 컴포넌트를 만들고 리뷰하는 데 |
| `artifact` | 글 | 풀이 | 작업 |
| `redo` | 같은 스터디를 다시 한다면 | 같은 스터디를 다시 한다면 | 앞으로 계속 참여한다면 |
| `next` | 다음 기수에 다시 | 다음 기수에 다시 | 앞으로도 계속 |

자리표시자 바로 뒤의 조사(을/를, 이/가, 은/는, 과/와)는 앞말의 받침에 맞춰 자동으로 바뀐다 — `{artifact}을` 은 "글을", "풀이를" 이 된다. 그래서 조사가 따라붙는 값(`artifact`)은 한글로 끝나야 한다. 영문으로 끝나면 "PR을(를)" 처럼 병기된다.

공통 문항을 seed 에서 참조할 때 `required` 와 `config` 를 덮어쓸 수 있다. 문구는 덮어쓸 수 없다 — 문구가 다르면 같은 문항이 아니다.

공통 문항의 **문구나 보기를 고치는 것은 이전 기수와의 비교를 끊는 일**이다. `src/questions/common.test.ts` 가 블로그 스터디 vars 로 렌더링한 결과를 고정해 두고 있으니, 이 테스트가 깨지면 그 뜻이다. 꼭 고쳐야 하면 새 `key` 로 추가하고 옛 것은 남긴다.

## 저장 구조

```
questions  (id, survey_id, position, key, type, label, required, config)
answers    (response_id, question_id, value)
```

문항은 설문마다 행으로 들어가고(공통 문항도 설문마다 복사된다 — `key` 만 같다), 답은 문항당 한 행이다. 설문마다 넓은 테이블을 만들지 않는 이유는 스키마 마이그레이션 없이 설문을 추가하고, `key` 로 설문을 가로질러 집계하기 위해서다.

```sql
-- 프로그램·기수별 목표 달성도 평균
SELECT p.name AS program, c.name AS cohort, AVG(CAST(a.value AS REAL)) AS avg
FROM answers a
JOIN questions q ON q.id = a.question_id
JOIN surveys sv ON sv.id = q.survey_id
JOIN cohorts c ON c.id = sv.cohort_id
JOIN programs p ON p.id = c.program_id
WHERE q.key = 'goal_achieved'
GROUP BY p.id, c.id;
```

## 유형 추가하기

유형 하나는 파일 하나다. 예를 들어 복수 선택 `multi` 를 넣는다면:

1. `src/db/schema.ts` 의 `questionTypes` 에 `'multi'` 를 넣는다.
2. `src/questions/types/multi.tsx` 를 만든다.

```tsx
import type { QuestionTypeDef } from '../definition'

export interface MultiConfig { options: string[] }

export const multi: QuestionTypeDef<MultiConfig> = {
  defaultConfig: { options: [] },
  // 저장값은 JSON 배열 문자열로 한다
  validate: (value, config) => {
    const picked = JSON.parse(value) as unknown
    return Array.isArray(picked) && picked.every((p) => config.options.includes(p)) ? null : '보기에 없는 값입니다'
  },
  Input: ({ id, label, required, config, value, onChange }) => { /* CheckboxGroup */ },
  Result: ({ config, values }) => { /* 보기별 개수 */ },
}
```

3. `src/questions/registry.tsx` 의 `registry` 에 `multi` 를 넣는다. 빠지면 타입 오류가 난다.

서버 검증, 응답 화면, 결과 화면은 registry 를 거치므로 그 밖에 고칠 곳은 없다. 마이그레이션도 없다 — `type` 컬럼은 TEXT 라 DB 는 새 이름을 모른다.

## 넣지 않은 것

복수 선택, 드롭다운, 행렬(matrix), 날짜, 파일 첨부, 조건부 분기. 회고 설문에는 위 네 유형이면 충분했고, 설문 빌더가 커지는 것을 막기 위해서다. 필요해지면 위 절차로 하나씩 넣는다.
