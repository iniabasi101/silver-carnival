import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

type Props = {
  value: number
  // Return false to reject the change (e.g. the editor hasn't given their name yet)
  onCommit: (next: number) => boolean | void
  large?: boolean
}

export function QuantityCell({ value, onCommit, large }: Props) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  const commit = (raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw)))
    if (!Number.isFinite(n) || raw.trim() === '') {
      setDraft(String(value))
      return
    }
    setDraft(String(n))
    if (n !== value && onCommit(n) === false) setDraft(String(value))
  }

  const tone =
    value === 0 ? 'qty-empty' : value <= 2 ? 'qty-low' : 'qty-ok'

  return (
    <div className={`qty ${tone} ${large ? 'qty-large' : ''}`}>
      <button
        type="button"
        className="qty-step"
        aria-label="Decrease"
        onClick={() => value > 0 && onCommit(value - 1)}
      >
        <Minus size={12} />
      </button>
      <input
        inputMode="numeric"
        aria-label="Quantity"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(String(value))
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <button
        type="button"
        className="qty-step"
        aria-label="Increase"
        onClick={() => onCommit(value + 1)}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
