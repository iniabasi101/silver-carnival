import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { activity, branches, frames, stock } from '../../db/schema.js'

export type Branch = { id: number; name: string }

export type Activity = {
  id: number
  actor: string
  action: string
  detail: string
  branchId: number | null
  createdAt: string
}

export type Frame = {
  id: number
  sku: string
  brand: string
  model: string
  color: string
  category: string
  price: string | null
  photoKey: string | null
  notes: string
  // branchId -> quantity
  stock: Record<number, number>
}

export type FrameInput = {
  sku: string
  brand: string
  model: string
  color: string
  category: string
  price: string | null
  photoKey: string | null
  notes: string
}

function cleanFrame(data: FrameInput): FrameInput {
  const str = (v: unknown, max = 200) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''
  const brand = str(data.brand)
  if (!brand) throw new Error('Brand is required')
  const price = str(data.price ?? '', 20)
  if (price && !/^\d+(\.\d{1,2})?$/.test(price)) {
    throw new Error('Price must be a number')
  }
  return {
    sku: str(data.sku, 80),
    brand,
    model: str(data.model),
    color: str(data.color),
    category: str(data.category, 80) || 'Optical',
    price: price || null,
    photoKey: data.photoKey ? str(data.photoKey, 120) : null,
    notes: str(data.notes, 1000),
  }
}

// Every write must say who made it. The name is entered in the UI and
// re-checked here so it can't be skipped.
function cleanActor(actor: unknown) {
  const a = typeof actor === 'string' ? actor.trim().slice(0, 60) : ''
  if (!a) throw new Error('Please enter your name before making changes')
  return a
}

const frameLabel = (f: { brand: string; model: string }) =>
  [f.brand, f.model].filter(Boolean).join(' ')

async function log(entry: typeof activity.$inferInsert) {
  await db.insert(activity).values(entry)
}

async function recentActivity(): Promise<Activity[]> {
  const rows = await db
    .select()
    .from(activity)
    .orderBy(desc(activity.createdAt), desc(activity.id))
    .limit(60)
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    detail: r.detail,
    branchId: r.branchId,
    createdAt: r.createdAt.toISOString(),
  }))
}

export const getInventory = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [branchRows, frameRows, stockRows, activityRows] = await Promise.all([
      db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .orderBy(asc(branches.id)),
      db.select().from(frames).orderBy(asc(frames.brand), asc(frames.model)),
      db.select().from(stock),
      recentActivity(),
    ])

    const byFrame = new Map<number, Record<number, number>>()
    for (const s of stockRows) {
      const entry = byFrame.get(s.frameId) ?? {}
      entry[s.branchId] = s.quantity
      byFrame.set(s.frameId, entry)
    }

    const result: Frame[] = frameRows.map((f) => ({
      id: f.id,
      sku: f.sku,
      brand: f.brand,
      model: f.model,
      color: f.color,
      category: f.category,
      price: f.price,
      photoKey: f.photoKey,
      notes: f.notes,
      stock: byFrame.get(f.id) ?? {},
    }))

    return {
      branches: branchRows as Branch[],
      frames: result,
      activity: activityRows,
    }
  },
)

export const getActivity = createServerFn({ method: 'GET' }).handler(() =>
  recentActivity(),
)

export const createFrame = createServerFn({ method: 'POST' })
  .inputValidator((data: { actor: string; frame: FrameInput }) => ({
    actor: cleanActor(data.actor),
    frame: cleanFrame(data.frame),
  }))
  .handler(async ({ data }) => {
    const [row] = await db.insert(frames).values(data.frame).returning()
    await log({
      actor: data.actor,
      action: 'frame_add',
      detail: `added ${frameLabel(row)}`,
      frameId: row.id,
    })
    return row.id
  })

export const updateFrame = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { actor: string; id: number; frame: FrameInput }) => ({
      actor: cleanActor(data.actor),
      id: Number(data.id),
      frame: cleanFrame(data.frame),
    }),
  )
  .handler(async ({ data }) => {
    await db.update(frames).set(data.frame).where(eq(frames.id, data.id))
    await log({
      actor: data.actor,
      action: 'frame_edit',
      detail: `edited ${frameLabel(data.frame)}`,
      frameId: data.id,
    })
    return true
  })

export const deleteFrame = createServerFn({ method: 'POST' })
  .inputValidator((data: { actor: string; id: number }) => ({
    actor: cleanActor(data.actor),
    id: Number(data.id),
  }))
  .handler(async ({ data }) => {
    const [row] = await db
      .delete(frames)
      .where(eq(frames.id, data.id))
      .returning()
    if (row) {
      await log({
        actor: data.actor,
        action: 'frame_delete',
        detail: `deleted ${frameLabel(row)}`,
        frameId: data.id,
      })
    }
    return true
  })

// Rapid +/- clicks by the same person on the same cell are folded into one
// activity entry instead of flooding the log.
const MERGE_WINDOW = sql`now() - interval '3 minutes'`

export const setQuantity = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      actor: string
      frameId: number
      branchId: number
      quantity: number
    }) => {
      const quantity = Math.floor(Number(data.quantity))
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) {
        throw new Error('Quantity must be a whole number of 0 or more')
      }
      return {
        actor: cleanActor(data.actor),
        frameId: Number(data.frameId),
        branchId: Number(data.branchId),
        quantity,
      }
    },
  )
  .handler(async ({ data }) => {
    const { actor, frameId, branchId, quantity } = data
    const [[frame], [branch], [prev]] = await Promise.all([
      db.select().from(frames).where(eq(frames.id, frameId)),
      db.select().from(branches).where(eq(branches.id, branchId)),
      db
        .select({ quantity: stock.quantity })
        .from(stock)
        .where(and(eq(stock.frameId, frameId), eq(stock.branchId, branchId))),
    ])
    if (!frame || !branch) throw new Error('That frame or branch no longer exists')
    const before = prev?.quantity ?? 0

    await db
      .insert(stock)
      .values({ frameId, branchId, quantity })
      .onConflictDoUpdate({
        target: [stock.frameId, stock.branchId],
        set: { quantity, updatedAt: sql`now()` },
      })

    const [recent] = await db
      .select()
      .from(activity)
      .where(
        and(
          eq(activity.action, 'quantity'),
          eq(activity.actor, actor),
          eq(activity.frameId, frameId),
          eq(activity.branchId, branchId),
          gt(activity.createdAt, MERGE_WINDOW),
        ),
      )
      .orderBy(desc(activity.id))
      .limit(1)

    const from = recent?.fromQty ?? before
    const detail = `set ${frameLabel(frame)} at ${branch.name}: ${from} → ${quantity}`
    if (recent) {
      await db
        .update(activity)
        .set({ toQty: quantity, detail, createdAt: sql`now()` })
        .where(eq(activity.id, recent.id))
    } else {
      await log({
        actor,
        action: 'quantity',
        detail,
        frameId,
        branchId,
        fromQty: from,
        toQty: quantity,
      })
    }
    return true
  })

const cleanName = (name: unknown) => {
  const n = typeof name === 'string' ? name.trim().slice(0, 80) : ''
  if (!n) throw new Error('Branch name is required')
  return n
}

export const createBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: { actor: string; name: string }) => ({
    actor: cleanActor(data.actor),
    name: cleanName(data.name),
  }))
  .handler(async ({ data }) => {
    const [row] = await db
      .insert(branches)
      .values({ name: data.name })
      .returning()
    await log({
      actor: data.actor,
      action: 'branch_add',
      detail: `added branch ${row.name}`,
      branchId: row.id,
    })
    return { id: row.id, name: row.name } as Branch
  })

export const renameBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: { actor: string; id: number; name: string }) => ({
    actor: cleanActor(data.actor),
    id: Number(data.id),
    name: cleanName(data.name),
  }))
  .handler(async ({ data }) => {
    const [old] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, data.id))
    await db
      .update(branches)
      .set({ name: data.name })
      .where(eq(branches.id, data.id))
    if (old && old.name !== data.name) {
      await log({
        actor: data.actor,
        action: 'branch_rename',
        detail: `renamed branch ${old.name} to ${data.name}`,
        branchId: data.id,
      })
    }
    return true
  })

export const deleteBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: { actor: string; id: number }) => ({
    actor: cleanActor(data.actor),
    id: Number(data.id),
  }))
  .handler(async ({ data }) => {
    const [row] = await db
      .delete(branches)
      .where(eq(branches.id, data.id))
      .returning()
    if (row) {
      await log({
        actor: data.actor,
        action: 'branch_delete',
        detail: `deleted branch ${row.name}`,
        branchId: data.id,
      })
    }
    return true
  })
