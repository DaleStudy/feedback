import type { ReactNode } from 'react'

// 문항 유형 하나가 갖춰야 하는 것. 새 유형은 이 인터페이스로 파일 하나를 만들고 registry 에 등록한다.
// 메서드 시그니처를 쓰는 이유: 프로퍼티형 함수는 strictFunctionTypes 에서 매개변수가 반공변이라
// QuestionTypeDef<ScaleConfig> 를 QuestionTypeDef<object> 자리에 넣을 수 없다.
export interface QuestionTypeDef<C extends object> {
  // seed 의 config 와 병합되는 기본값. 모양이 곧 이 유형의 설정 스키마다.
  defaultConfig: C
  // 유효하지 않으면 사용자에게 보여줄 메시지, 유효하면 null
  validate(value: string, config: C): string | null
  Input(props: InputProps<C>): ReactNode
  Result(props: ResultProps<C>): ReactNode
}

export interface InputProps<C> {
  id: number
  label: string
  required: boolean
  config: C
  value: string
  onChange: (value: string) => void
}

export interface ResultProps<C> {
  config: C
  values: string[]
}
