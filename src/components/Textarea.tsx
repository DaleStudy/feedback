import { type KeyboardEvent, useId } from 'react'
import { Label } from 'daleui'

type TextareaProps = {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  required?: boolean
  rows?: number
  placeholder?: string
  size?: 'md' | 'lg'
} & ({ label: string; labelledBy?: never } | { label?: never; labelledBy: string })

// daleui 에 아직 Textarea 가 없어 임시로 둔다. daleui 에 추가되면 교체한다.
// 폼에서는 label 로 레이블을 그리고, 응답 화면에서는 질문 제목을 labelledBy 로 가리킨다.
export function Textarea({ label, labelledBy, value, onChange, onKeyDown, required, rows = 4, placeholder, size = 'md' }: TextareaProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      {label && <Label labelText={label} htmlFor={id} required={required} />}
      <textarea
        id={id}
        rows={rows}
        value={value}
        required={required}
        placeholder={placeholder}
        aria-labelledby={labelledBy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`w-full resize-y rounded-[var(--radii-md)] border border-[var(--colors-border-neutral)] bg-[var(--colors-bg-neutral)] px-4 py-3 text-[var(--colors-fg-neutral)] placeholder:text-[var(--colors-fg-neutral-placeholder)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--colors-border-brand-focus)] ${size === 'lg' ? 'text-lg leading-relaxed' : 'text-sm'}`}
      />
    </div>
  )
}
