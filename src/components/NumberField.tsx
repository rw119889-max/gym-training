import { useEffect, useState } from 'react'

interface Props {
  value: number
  onValue: (value: number) => void
  min?: number
  max?: number
  step?: string
  inputMode?: 'numeric' | 'decimal'
  placeholder?: string
  className?: string
}

function toText(value: number): string {
  return value === 0 ? '' : String(value)
}

export default function NumberField({
  value,
  onValue,
  min,
  max,
  step,
  inputMode = 'decimal',
  placeholder = '0',
  className = '',
}: Props) {
  const [text, setText] = useState(() => toText(value))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setText(toText(value))
  }, [value, editing])

  const clamp = (n: number) => {
    let result = n
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return result
  }

  return (
    <input
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
      inputMode={inputMode}
      placeholder={placeholder}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(event) => {
        const raw = event.target.value
        setText(raw)
        if (raw === '') {
          onValue(min ?? 0)
          return
        }
        const parsed = Number.parseFloat(raw)
        if (Number.isFinite(parsed)) onValue(parsed)
      }}
      onBlur={() => {
        setEditing(false)
        const parsed = Number.parseFloat(text)
        onValue(Number.isFinite(parsed) ? clamp(parsed) : min ?? 0)
      }}
    />
  )
}