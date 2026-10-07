import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Download, Glasses, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import {
  createBranch,
  createFrame,
  deleteBranch,
  deleteFrame,
  getActivity,
  getInventory,
  renameBranch,
  setQuantity,
  updateFrame,
} from '@/server/inventory.functions'
import type { Activity, Branch, Frame, FrameInput } from '@/server/inventory.functions'
import { QuantityCell } from '@/components/QuantityCell'
import { FrameDialog } from '@/components/FrameDialog'
import { BranchDialog } from '@/components/BranchDialog'
import { NameDialog } from '@/components/NameDialog'
import { ActivityPanel } from '@/components/ActivityPanel'
import { photoUrl } from '@/components/photo'

export const Route = createFileRoute('/')({
  loader: () => getInventory(),
  component: Inventory,
})

const ALL = 'all'
const NAME_KEY = 'frame-inventory:editor-name'

function Inventory() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [frames, setFrames] = useState<Frame[]>(data.frames)
  const branches: Branch[] = data.branches

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [view, setView] = useState<string>(ALL)
  const [lowOnly, setLowOnly] = useState(false)
  const [editing, setEditing] = useState<Frame | null>(null)
  const [frameOpen, setFrameOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activity, setActivity] = useState<Activity[]>(data.activity)

  // The editor's name is remembered on this device and attached to every change.
  const [actor, setActor] = useState('')
  const [nameOpen, setNameOpen] = useState(false)
  const pending = useRef<((name: string) => void) | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY) ?? ''
    setActor(saved)
    if (!saved) setNameOpen(true)
  }, [])

  // Runs `fn` with the editor's name, asking for it first if we don't have one.
  // Returns false when the action had to wait for the name.
  const withName = (fn: (name: string) => void): boolean => {
    if (actor) {
      fn(actor)
      return true
    }
    pending.current = fn
    setNameOpen(true)
    return false
  }

  const saveName = (name: string) => {
    localStorage.setItem(NAME_KEY, name)
    setActor(name)
    setNameOpen(false)
    const fn = pending.current
    pending.current = null
    fn?.(name)
  }

  const closeName = () => {
    pending.current = null
    setNameOpen(false)
  }

  useEffect(() => setFrames(data.frames), [data.frames])
  useEffect(() => setActivity(data.activity), [data.activity])
  useEffect(() => {
    if (view !== ALL && !branches.some((b) => String(b.id) === view)) setView(ALL)
  }, [branches, view])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const refresh = () => router.invalidate()
  const visibleBranches = view === ALL ? branches : branches.filter((b) => String(b.id) === view)
  const categories = useMemo(
    () => Array.from(new Set(frames.map((f) => f.category))).sort(),
    [frames],
  )

  const totalFor = (f: Frame) =>
    visibleBranches.reduce((sum, b) => sum + (f.stock[b.id] ?? 0), 0)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return frames.filter((f) => {
      if (category !== ALL && f.category !== category) return false
      if (lowOnly && totalFor(f) > 2) return false
      if (!q) return true
      return [f.brand, f.model, f.sku, f.color, f.category, f.notes]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [frames, query, category, lowOnly, view, branches])

  const totalUnits = frames.reduce((s, f) => s + totalFor(f), 0)
  const outCount = frames.filter((f) => totalFor(f) === 0).length

  const changeQty = (frameId: number, branchId: number, quantity: number) =>
    withName(async (name) => {
      const prev = frames
      setFrames((fs) =>
        fs.map((f) => (f.id === frameId ? { ...f, stock: { ...f.stock, [branchId]: quantity } } : f)),
      )
      try {
        await setQuantity({ data: { actor: name, frameId, branchId, quantity } })
        setActivity(await getActivity())
      } catch {
        setFrames(prev)
        setToast('Could not save that quantity — please try again.')
      }
    })

  // FrameDialog and BranchDialog only open once a name is known, so `actor` is set here.
  const saveFrame = async (input: FrameInput) => {
    if (editing) await updateFrame({ data: { actor, id: editing.id, frame: input } })
    else await createFrame({ data: { actor, frame: input } })
    setFrameOpen(false)
    setToast(editing ? 'Frame updated' : 'Frame added')
    await refresh()
  }

  const removeFrame = (f: Frame) =>
    withName(async (name) => {
      if (!confirm(`Delete ${f.brand} ${f.model}? This removes its stock at every branch.`)) return
      await deleteFrame({ data: { actor: name, id: f.id } })
      setToast('Frame deleted')
      await refresh()
    })

  const exportCsv = () => {
    const header = ['Brand', 'Model', 'SKU', 'Colour', 'Category', 'Price', ...visibleBranches.map((b) => b.name), 'Total']
    const lines = rows.map((f) => [
      f.brand, f.model, f.sku, f.color, f.category, f.price ?? '',
      ...visibleBranches.map((b) => String(f.stock[b.id] ?? 0)),
      String(totalFor(f)),
    ])
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `frame-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openNew = () =>
    withName(() => {
      setEditing(null)
      setFrameOpen(true)
    })

  const openEdit = (f: Frame) =>
    withName(() => {
      setEditing(f)
      setFrameOpen(true)
    })

  const openBranches = () => withName(() => setBranchOpen(true))

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Glasses size={18} /></span>
          <div>
            <h1>Frame Inventory</h1>
            <p>Every frame, every branch, one sheet.</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost editor" onClick={() => setNameOpen(true)} title="Change who is editing">
            <UserRound size={16} />
            {actor ? <>Editing as <strong>{actor}</strong></> : 'Enter your name'}
          </button>
          <button className="btn ghost" onClick={openBranches}>
            <Building2 size={16} /> Branches
          </button>
          <button className="btn ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={16} /> Export
          </button>
          <button className="btn primary" onClick={openNew}>
            <Plus size={16} /> Add frame
          </button>
        </div>
      </header>

      <div className="layout">
        <main className="main">
          <section className="stats">
            <Stat label="Frame styles" value={frames.length} />
            <Stat label={view === ALL ? 'Units across branches' : `Units at ${visibleBranches[0]?.name}`} value={totalUnits} />
            <Stat label="Out of stock" value={outCount} tone={outCount ? 'warn' : undefined} />
            <Stat label="Branches" value={branches.length} />
          </section>

          <nav className="tabs" aria-label="Branch view">
            <button className={view === ALL ? 'tab active' : 'tab'} onClick={() => setView(ALL)}>
              All branches
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                className={view === String(b.id) ? 'tab active' : 'tab'}
                onClick={() => setView(String(b.id))}
              >
                {b.name}
              </button>
            ))}
            <button className="tab add" onClick={openBranches} aria-label="Add branch">
              <Plus size={14} />
            </button>
          </nav>

          <div className="toolbar">
            <label className="search">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand, model, code, colour…" />
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value={ALL}>All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              Low stock only
            </label>
            <span className="count">{rows.length} of {frames.length}</span>
          </div>

          <div className="gallery-wrap">
            {branches.length === 0 ? (
              <Empty
                title="Start by adding your branches"
                body="Each branch gets its own stock count on every frame card."
                action={<button className="btn primary" onClick={openBranches}><Building2 size={16} /> Add a branch</button>}
              />
            ) : frames.length === 0 ? (
              <Empty
                title="No frames yet"
                body="Add your first frame with a photo, brand and model. Then fill in quantities for each branch right on its card."
                action={<button className="btn primary" onClick={openNew}><Plus size={16} /> Add a frame</button>}
              />
            ) : rows.length === 0 ? (
              <p className="no-match">No frames match these filters.</p>
            ) : (
              <ul className="gallery">
                {rows.map((f) => (
                  <FrameCard
                    key={f.id}
                    frame={f}
                    branches={visibleBranches}
                    single={view !== ALL && visibleBranches.length === 1}
                    total={totalFor(f)}
                    onQty={(branchId, q) => changeQty(f.id, branchId, q)}
                    onEdit={() => openEdit(f)}
                    onDelete={() => removeFrame(f)}
                  />
                ))}
              </ul>
            )}
          </div>
        </main>
        <ActivityPanel items={activity} />
      </div>

      <FrameDialog
        open={frameOpen}
        frame={editing}
        categories={categories}
        onClose={() => setFrameOpen(false)}
        onSave={saveFrame}
      />
      <BranchDialog
        open={branchOpen}
        branches={branches}
        onClose={() => setBranchOpen(false)}
        onCreate={async (name) => { await createBranch({ data: { actor, name } }); await refresh() }}
        onRename={async (id, name) => { await renameBranch({ data: { actor, id, name } }); await refresh() }}
        onDelete={async (id) => { await deleteBranch({ data: { actor, id } }); await refresh() }}
      />
      <NameDialog open={nameOpen} current={actor} onClose={closeName} onSave={saveName} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function FrameCard({
  frame: f,
  branches,
  single,
  total,
  onQty,
  onEdit,
  onDelete,
}: {
  frame: Frame
  branches: Branch[]
  single: boolean
  total: number
  onQty: (branchId: number, quantity: number) => boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = total === 0 ? 'out' : total <= 2 ? 'low' : null
  return (
    <li className={`card ${status === 'out' ? 'card-out' : ''}`}>
      <div className="card-photo">
        {f.photoKey ? (
          <img src={photoUrl(f.photoKey, 480)} alt={`${f.brand} ${f.model}`} loading="lazy" />
        ) : (
          <span className="photo-ph"><Glasses size={40} /></span>
        )}
        <span className="chip card-cat">{f.category}</span>
        {status && (
          <span className={`card-badge badge-${status}`}>{status === 'out' ? 'Out of stock' : 'Low stock'}</span>
        )}
        <div className="card-actions">
          <button className="icon-btn" aria-label="Edit frame" onClick={onEdit}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" aria-label="Delete frame" onClick={onDelete}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="card-title">
          <div>
            <strong>{f.brand}</strong>
            <span>{f.model || '—'}</span>
          </div>
          {f.price && <span className="mono card-price">{Number(f.price).toFixed(2)}</span>}
        </div>
        <p className="card-meta">
          {[f.sku && <span key="sku" className="mono">{f.sku}</span>, f.color && <span key="c">{f.color}</span>].filter(Boolean)}
        </p>
        {single ? (
          <div className="card-single">
            <span>In stock</span>
            <QuantityCell value={f.stock[branches[0].id] ?? 0} large onCommit={(q) => onQty(branches[0].id, q)} />
          </div>
        ) : (
          <ul className="card-stock">
            {branches.map((b) => (
              <li key={b.id}>
                <span>{b.name}</span>
                <QuantityCell value={f.stock[b.id] ?? 0} onCommit={(q) => onQty(b.id, q)} />
              </li>
            ))}
            <li className="card-total">
              <span>Total</span>
              <strong className="mono">{total}</strong>
            </li>
          </ul>
        )}
      </div>
    </li>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  )
}

function Empty({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-mark"><Glasses size={28} /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  )
}
