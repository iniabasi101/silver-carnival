import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import type { Frame, FrameInput } from '@/server/inventory.functions'
import { photoUrl } from './photo'

const DEFAULT_CATEGORIES = ['Optical', 'Sunglasses', 'Kids', 'Sports', 'Reading']

type Props = {
  open: boolean
  frame: Frame | null
  categories: string[]
  onClose: () => void
  onSave: (input: FrameInput) => Promise<void>
}

const empty: FrameInput = {
  sku: '',
  brand: '',
  model: '',
  color: '',
  category: 'Optical',
  price: null,
  photoKey: null,
  notes: '',
}

export function FrameDialog({ open, frame, categories, onClose, onSave }: Props) {
  const [form, setForm] = useState<FrameInput>(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!open) {
      ref.current?.close()
      return
    }
    setError(null)
    setForm(
      frame
        ? {
            sku: frame.sku,
            brand: frame.brand,
            model: frame.model,
            color: frame.color,
            category: frame.category,
            price: frame.price,
            photoKey: frame.photoKey,
            notes: frame.notes,
          }
        : empty,
    )
    if (!ref.current?.open) ref.current?.showModal()
  }, [open, frame])

  const set = <K extends keyof FrameInput>(k: K, v: FrameInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/photos', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      set('photoKey', json.key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]))

  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit}>
        <header className="dialog-head">
          <h2>{frame ? 'Edit frame' : 'Add a frame'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="dialog-body">
          <label className="photo-drop">
            {form.photoKey ? (
              <img src={photoUrl(form.photoKey, 400)} alt="" />
            ) : uploading ? (
              <Loader2 className="spin" size={22} />
            ) : (
              <>
                <ImagePlus size={22} />
                <span>Add photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {form.photoKey && (
            <button type="button" className="link-btn" onClick={() => set('photoKey', null)}>
              Remove photo
            </button>
          )}

          <div className="grid2">
            <Field label="Brand *">
              <input required value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Ray-Ban" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="RB5154 Clubmaster" />
            </Field>
            <Field label="Code / SKU">
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="RB5154-2000" />
            </Field>
            <Field label="Colour">
              <input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Black / Gold" />
            </Field>
            <Field label="Category">
              <input list="category-list" value={form.category} onChange={(e) => set('category', e.target.value)} />
              <datalist id="category-list">
                {allCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Price">
              <input
                inputMode="decimal"
                value={form.price ?? ''}
                onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, '') || null)}
                placeholder="0.00"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
          {error && <p className="form-error">{error}</p>}
        </div>

        <footer className="dialog-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving || uploading}>
            {saving ? 'Saving…' : frame ? 'Save changes' : 'Add frame'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
