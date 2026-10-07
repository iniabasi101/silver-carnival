import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { Branch } from '@/server/inventory.functions'

type Props = {
  open: boolean
  branches: Branch[]
  onClose: () => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function BranchDialog({ open, branches, onClose, onCreate, onRename, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    if (!open) ref.current?.close()
    setError(null)
  }, [open])

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <dialog ref={ref} className="dialog narrow" onClose={onClose}>
      <header className="dialog-head">
        <h2>Branches</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>
      <div className="dialog-body">
        <p className="muted">Each branch gets its own quantity column in the sheet.</p>
        <ul className="branch-list">
          {branches.map((b) => (
            <li key={b.id}>
              {editing?.id === b.id ? (
                <form
                  className="branch-edit"
                  onSubmit={(e) => {
                    e.preventDefault()
                    run(async () => {
                      await onRename(b.id, editing.name)
                      setEditing(null)
                    })
                  }}
                >
                  <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: b.id, name: e.target.value })} />
                  <button className="icon-btn" aria-label="Save name">
                    <Check size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <span>{b.name}</span>
                  <div className="row-actions">
                    <button className="icon-btn" aria-label={`Rename ${b.name}`} onClick={() => setEditing({ id: b.id, name: b.name })}>
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label={`Delete ${b.name}`}
                      onClick={() => {
                        if (confirm(`Delete "${b.name}" and all of its stock counts?`)) run(() => onDelete(b.id))
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {branches.length === 0 && <li className="muted">No branches yet.</li>}
        </ul>
        <form
          className="branch-add"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await onCreate(name)
              setName('')
            })
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Downtown clinic" />
          <button className="btn primary" disabled={!name.trim()}>
            Add branch
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>
    </dialog>
  )
}
