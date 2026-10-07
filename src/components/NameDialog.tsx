import { useEffect, useRef, useState } from 'react'
import { UserRound, X } from 'lucide-react'

type Props = {
  open: boolean
  current: string
  onClose: () => void
  onSave: (name: string) => void
}

export function NameDialog({ open, current, onClose, onSave }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(current)

  useEffect(() => {
    if (open) {
      setName(current)
      if (!ref.current?.open) ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open, current])

  return (
    <dialog ref={ref} className="dialog narrow" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onSave(name.trim())
        }}
      >
        <header className="dialog-head">
          <h2>Who's updating?</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">
          <p className="muted">
            Enter your name before making changes. It's shown next to every update in the activity log.
          </p>
          <label className="field">
            <span>Your name *</span>
            <input
              autoFocus
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amara (Downtown)"
            />
          </label>
        </div>
        <footer className="dialog-foot">
          <button type="button" className="btn" onClick={onClose}>Just browsing</button>
          <button className="btn primary" disabled={!name.trim()}>
            <UserRound size={16} /> Continue
          </button>
        </footer>
      </form>
    </dialog>
  )
}
