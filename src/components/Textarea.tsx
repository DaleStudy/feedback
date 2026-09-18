import { useId } from 'react'
import { Label } from 'daleui'

interface TextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  rows?: number
}

// daleui 에 아직 Textarea 가 없어 임시로 둔다. daleui 에 추가되면 교체한다.
export function Textarea({ label, value, onChange, required, rows = 4 }: TextareaProps) {
  const id = useId()
  return (
    <div>
      <Label labelText={label} htmlFor={id} required={required} />
      <textarea
        id={id}
        rows={rows}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  )
}
