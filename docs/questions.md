# 문항 (questions)

설문의 문항이 어떻게 정의되고, 저장되고, 검증되고, 그려지는지. 설문을 만들거나 유형을 추가하기 전에 읽는다.

## 한눈에

| type | 뜻 | 응답자에게 | 저장값 (`answers.value`) | 검증 | 결과 화면 |
|---|---|---|---|---|---|
| `scale` | 숫자 척도 | 가로로 놓인 버튼 `min`…`max`, 양끝 라벨 | `'1'`~`'5'` 같은 정수 문자열 | `min` 이상 `max` 이하의 정수 | 한 줄 분포 막대 + 평균 |
| `short` | 한 줄 서술 | 한 줄 입력 | 자유 문자열 | 없음 | 답변 목록 (3개 + 더 보기) |
| `long` | 여러 줄 서술 | 여러 줄 입력 | 자유 문자열 | 없음 | 답변 목록 (3개 + 더 보기) |
| `choice` | 단일 선택 | 세로로 놓인 버튼 | `options` 중 하나 그대로 | `options` 에 있는 값 | 보기별 비율 막대 |

모든 유형에 공통:

- `required` (기본 `true`) — 비어 있으면 제출이 거부된다. 비필수 문항의 빈 답은 저장하지 않는다.
- 값은 유형과 무관하게 항상 문자열로 저장한다. `scale` 의 평균은 결과 화면에서 `Number()` 로 계산한다.
- 검증은 서버(`submitResponse`)에서 한다. 화면의 `required` 속성은 편의일 뿐 보안 경계가 아니다.

## config

유형별 설정은 `questions.config` JSON 컬럼 하나에 담는다. 모양은 유형 정의의 `defaultConfig` 가 정하고, 저장된 값은 그 위에 얹힌다. 즉 기본값과 다른 값만 저장하면 된다.

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

라벨은 `1 · 전혀 아니다`, `5 · 매우 그렇다` 처럼 버튼 아래 양끝에 붙는다. 질문이 "얼마나 참여했나요" 처럼 동의/비동의 축이 아니면 라벨을 꼭 바꾼다.

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

모든 프로그램(스터디·프로젝트)이 같은 `key` 로 묻는 문항. `src/questions/common.ts` 에 있고, 편집 화면의 "공통 문항 추가" 나 seed 의 `{ "common": "<key>" }` 로 넣는다. 설문끼리 비교는 `questions.key` 로 한다.

문항마다 `audience` 가 어느 회고의 기본 문항인지 적는다: `participants`(참여 회고) · `organizers`(운영 회고) · 없음(양쪽). 편집 화면의 "참여 회고 기본 문항 넣기" / "운영 회고 기본 문항 넣기" 가 이걸로 묶는다. 응답 자격과는 상관없다 — 누가 답하는지는 링크를 누구에게 주느냐가 정한다.

| key | type | 문항 | 비고 |
|---|---|---|---|
| `goal_achieved` | scale | 시작할 때 이 `{program}`에서 하고 싶었던 것을 얼마나 해냈나요? | |
| `effort_satisfied` | scale | `{activity}` 들인 노력에 스스로 만족하나요? | |
| `gave_back` | scale | 다른 참가자의 `{artifact}`을 읽고 댓글이나 반응을 남기는 데 얼마나 참여했나요? | 라벨 "거의 안 했다 · 적극적으로 했다" |
| `highlight` | long | `{period}` 내가 잘한 것 하나를 적어주세요. | |
| `lowlight` | long | `{period}` 나 스스로 아쉬웠던 것 하나를 적어주세요. | |
| `do_differently` | long | `{redo}` 무엇을 다르게 하시겠어요? | |
| `community_help` | long | 그렇게 하는 데 운영진이나 다른 참가자가 어떤 도움을 주면 좋을까요? | `do_differently` 바로 뒤에 둔다 |
| `recommend` | scale | 이 `{program}`를 주변 개발자에게 추천하시겠어요? | 라벨 "전혀 아니다 · 꼭 추천하겠다". 설문끼리 비교하는 대표 지표 |
| `rejoin` | choice | `{next}` 참여할 생각이 있나요? | 있다 / 없다. 조건은 `lowlight`·`do_differently`·`community_help` 가 받는다 |
| `join_organizers` | short | 다르게 해보고 싶은 것이 있었다면, 운영진이 되어 직접 바꿔 보는 건 어때요? 관심 있다면 연락받을 Discord 사용자명을 남겨 주세요. | 비필수. 답(Discord 사용자명)이 있으면 관심 있음. `do_differently` 의 답을 직접 실행할 수 있는 자리라는 걸 은근히 보여 준다. **실명 문항**(`identified`) — 결과 화면에 응답자 아이디가 붙는다. 차기 운영진 모집용 |

설계 의도: 커뮤니티가 무엇을 해줬는지가 아니라 참가자가 자기 활동을 먼저 돌아보고(`goal_achieved` ~ `lowlight`), 다시 한다면 어떻게 할지 생각한 뒤(`do_differently`), 그것을 위해 커뮤니티가 도울 것을 묻는(`community_help`) 순서다. 요청이 남 탓이 아니라 본인 계획에 붙는 부탁이 되게 하려는 것이다.

### 운영진 문항

운영 회고는 별도 설문으로 만든다. 공개 범위는 **링크로만**으로 두고, 링크는 운영진에게만 준다 — 운영진 피드백은 집계가 아니라 다음 기수 계획을 같이 짜는 대화의 시작이다. 결과는 편집자(보통 그 운영진)끼리 본다.

| key | type | 문항 | 비고 |
|---|---|---|---|
| `organizer_goal_achieved` | scale | 시작할 때 운영자로서 하고 싶었던 것을 얼마나 해냈나요? | |
| `organizer_sustainable` | scale | 운영에 들인 시간과 에너지는 다음에도 이어갈 수 있는 수준이었나요? | 운영진 소진 신호. 100% 자발적 운영에서 가장 큰 위험 |
| `organizer_presence` | scale | 참가자의 질문과 `{artifact}`에 반응하는 데 얼마나 시간을 쓸 수 있었나요? | 라벨 "거의 못 썼다 · 충분히 썼다" |
| `organizer_highlight` | long | `{period}` 운영자로서 잘한 것 하나를 적어주세요. | |
| `organizer_lowlight` | long | `{period}` 운영자로서 아쉬웠던 것 하나를 적어주세요. | |
| `organizer_do_differently` | long | `{redo}` 운영 방식에서 무엇을 다르게 하시겠어요? | |
| `organizer_help` | long | 그렇게 하는 데 커뮤니티 차원에서 다른 운영진이 어떤 도움을 주면 좋을까요? | `organizer_do_differently` 바로 뒤에 둔다 |
| `organizer_automate` | long | 반복 작업 중 자동화하거나 아예 없애고 싶은 것이 있다면 적어주세요. | 비필수 |
| `organizer_continue` | choice | `{next}` 운영을 맡을 생각이 있나요? | 있다 / 없다. 조건은 `organizer_help`·`organizer_automate` 가 받으므로 보기로 다시 묻지 않는다 |

### 양쪽 문항

참여·운영 회고 모두 맨 끝에 둔다 (`audience` 가 없는 공통 문항).

| key | type | 문항 | 비고 |
|---|---|---|---|
| `survey_feedback` | long | 헷갈렸던 문항이나 다음 설문에서 더 물어봤으면 하는 게 있었다면 알려주세요. | 비필수. 문항 자체가 잘 작동했는지 기수마다 확인한다 |

홈에는 공개 범위가 "홈에 보이기" 인 설문과 내가 이미 답한 설문만 보인다. 운영 회고처럼 "링크로만" 인 설문은 링크로만 들어온다.

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

`vars` 는 `surveys.vars` 에 저장되고, 편집 화면의 "공통 문항 변수" 가 이 값이다. 공통 문항을 넣을 때 서버가 이 값으로 문구를 렌더링해 `questions.label` 에 저장한다.

공통 문항은 `required` 만 덮어쓸 수 있다. 문구와 `config`(보기·척도)는 덮어쓸 수 없다 — 다르면 같은 문항이 아니다.

공통 문항의 **문구나 보기를 고치는 것은 이전 기수와의 비교를 끊는 일**이다. `src/questions/common.test.ts` 가 블로그 스터디 vars 로 렌더링한 결과를 고정해 두고 있으니, 이 테스트가 깨지면 그 뜻이다. 꼭 고쳐야 하면 새 `key` 로 추가하고 옛 것은 남긴다.

## 저장 구조

```
questions  (id, survey_id, position, key, type, label, required, identified, config)
answers    (response_id, question_id, value)
```

문항은 설문마다 행으로 들어가고(공통 문항도 설문마다 복사된다 — `key` 만 같다), 답은 문항당 한 행이다. 설문마다 넓은 테이블을 만들지 않는 이유는 스키마 마이그레이션 없이 설문을 추가하고, `key` 로 설문을 가로질러 집계하기 위해서다.

```sql
-- 설문별 목표 달성도 평균 (설문 제목으로 기수·프로그램을 구분한다)
SELECT sv.title, AVG(CAST(a.value AS REAL)) AS avg
FROM answers a
JOIN questions q ON q.id = a.question_id
JOIN surveys sv ON sv.id = q.survey_id
WHERE q.key = 'goal_achieved'
GROUP BY sv.id ORDER BY sv.created_at;
```

## 유형 추가하기

유형 하나는 파일 하나다. 예를 들어 복수 선택 `multi` 를 넣는다면:

1. `src/db/schema.ts` 의 `questionTypes` 에 `'multi'` 를 넣는다.
2. `src/questions/types/multi.tsx` 를 만든다.

```tsx
import type { QuestionTypeDef } from '../definition'

export interface MultiConfig { options: string[] }

export const multi: QuestionTypeDef<MultiConfig> = {
  name: '복수 선택', // 편집 화면의 유형 선택에 보이는 이름
  answerSeconds: 20, // 응답 화면의 "약 N분" 계산에 쓰는 한 문항당 초
  autoAdvance: false, // true 면 고르는 순간 다음 질문으로 넘어간다 (척도·선택). 여러 개를 고르는 유형은 false
  hint: '⌘/Ctrl + Enter 로 다음', // 확인 버튼 옆의 조작 안내
  defaultConfig: { options: [] },
  // 운영진이 저장하려는 config 검사
  validateConfig: (config) => (config.options.length >= 2 ? null : '보기를 두 개 이상 적어주세요'),
  // 저장값은 JSON 배열 문자열로 한다
  validate: (value, config) => {
    const picked = JSON.parse(value) as unknown
    return Array.isArray(picked) && picked.every((p) => config.options.includes(p)) ? null : '보기에 없는 값입니다'
  },
  // 문구는 응답 화면이 제목으로 그린다. 입력은 aria-labelledby={labelledBy} 로 그 제목을 가리킨다.
  // onSubmit 은 키보드로 다음 질문에 넘어갈 때 부른다.
  Input: ({ labelledBy, config, value, onChange, onSubmit }) => { /* CheckboxGroup */ },
  resultSection: 'numbers', // 결과 화면의 구역: 숫자형 패널('numbers') 또는 서술형 카드('answers')
  Result: ({ config, values }) => { /* 보기별 개수 */ },
  ConfigEditor: ({ config, onChange }) => { /* 보기 편집 폼. 설정이 없는 유형은 () => null */ },
}
```

3. `src/questions/registry.tsx` 의 `registry` 에 `multi` 를 넣는다. 빠지면 타입 오류가 난다.

서버 검증, 응답 화면, 결과 화면, 편집 화면은 registry 를 거치므로 그 밖에 고칠 곳은 없다. 마이그레이션도 없다 — `type` 컬럼은 TEXT 라 DB 는 새 이름을 모른다.

## 넣지 않은 것

복수 선택, 드롭다운, 행렬(matrix), 날짜, 파일 첨부, 조건부 분기. 회고 설문에는 위 네 유형이면 충분했고, 설문 빌더가 커지는 것을 막기 위해서다. 필요해지면 위 절차로 하나씩 넣는다.
