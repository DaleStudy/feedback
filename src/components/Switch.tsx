import { Text } from 'daleui'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

// daleui 에 아직 Switch 가 없어 임시로 둔다. daleui 에 추가되면 교체한다.
// 누르면 바로 반영되는 켜고 끄기에 쓴다 (확인 단계 없음). 레이블은 지금 상태를 말한다.
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--colors-border-brand-focus)] disabled:cursor-wait disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--colors-bg-solid-success)]' : 'bg-[var(--colors-bg-solid-neutral-disabled)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
      <Text size="sm" weight="semibold" tone="neutral">
        {label}
      </Text>
    </button>
  )
}
