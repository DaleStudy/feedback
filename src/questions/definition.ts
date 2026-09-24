import type { ReactNode } from 'react'

// 문항 유형 하나가 갖춰야 하는 것. 새 유형은 이 인터페이스로 파일 하나를 만들고 registry 에 등록한다.
// 메서드 시그니처를 쓰는 이유: 프로퍼티형 함수는 strictFunctionTypes 에서 매개변수가 반공변이라
// QuestionTypeDef<ScaleConfig> 를 QuestionTypeDef<object> 자리에 넣을 수 없다.
export interface QuestionTypeDef<C extends object> {
  // 편집 UI 의 유형 선택에 보이는 이름
  name: string
  // 응답 화면이 예상 소요 시간(약 N분)을 셀 때 쓰는 한 문항당 초
  answerSeconds: number
  // 고르는 순간 답이 정해지는 유형(척도·선택)은 고르면 바로 다음 질문으로 넘어간다
  autoAdvance: boolean
  // 응답 화면의 확인 버튼 옆에 보이는 조작 안내
  hint: string
  // seed 의 config 와 병합되는 기본값. 모양이 곧 이 유형의 설정 스키마다.
  defaultConfig: C
  // 저장하려는 config 가 잘못됐으면 운영진에게 보여줄 메시지, 괜찮으면 null
  validateConfig(config: C): string | null
  // 유효하지 않으면 사용자에게 보여줄 메시지, 유효하면 null
  validate(value: string, config: C): string | null
  Input(props: InputProps<C>): ReactNode
  // 결과 화면에서 어느 구역에 모이는가. 숫자형은 한 패널에 모아 비교하고, 서술형은 문항마다 카드로 읽는다.
  resultSection: 'numbers' | 'answers'
  Result(props: ResultProps<C>): ReactNode
  // 편집 UI 에서 config 를 고치는 폼. 설정이 없는 유형은 null 을 돌려준다.
  ConfigEditor(props: ConfigEditorProps<C>): ReactNode
}

// 문구는 응답 화면이 제목(Heading)으로 크게 그리고, 입력은 그 제목을 aria-labelledby 로 가리킨다.
export interface InputProps<C> {
  id: number
  labelledBy: string
  config: C
  value: string
  onChange: (value: string) => void
  // 답을 다 적고 다음으로 넘어가려는 키 조작(서술은 ⌘/Ctrl+Enter, 단답은 Enter)
  onSubmit: () => void
}

export interface ResultProps<C> {
  config: C
  values: string[]
}

export interface ConfigEditorProps<C> {
  config: C
  // 메서드 시그니처인 이유는 위와 같다. 프로퍼티형이면 C 가 반공변 자리에 놓여 registry 에 담을 수 없다.
  onChange(config: C): void
}
