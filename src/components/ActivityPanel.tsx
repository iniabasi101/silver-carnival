import { useEffect, useState } from 'react'
import { Building2, History, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Activity } from '@/server/inventory.functions'

const ICONS: Record<string, React.ReactNode> = {
  quantity: <Pencil size={12} />,
  frame_add: <Plus size={12} />,
  frame_edit: <Pencil size={12} />,
  frame_delete: <Trash2 size={12} />,
  branch_add: <Building2 size={12} />,
  branch_rename: <Building2 size={12} />,
  branch_delete: <Minus size={12} />,
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function ActivityPanel({ items }: { items: Activity[] }) {
  // Relative times are computed on the client only to avoid SSR mismatches.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <aside className="activity" aria-label="Update activity">
      <header className="activity-head">
        <History size={16} />
        <h2>Update activity</h2>
      </header>
      {items.length === 0 ? (
        <p className="activity-empty">No updates yet. Changes made by your team appear here.</p>
      ) : (
        <ol className="activity-list">
          {items.map((a) => (
            <li key={a.id} className={`act act-${a.action}`}>
              <span className="act-icon">{ICONS[a.action] ?? <Pencil size={12} />}</span>
              <div>
                <p>
                  <strong>{a.actor}</strong>{' '}
                  {a.detail}
                </p>
                <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString()}>
                  {now ? ago(a.createdAt, now) : ' '}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
