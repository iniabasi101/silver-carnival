import {
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const branches = pgTable('branches', {
  id: serial().primaryKey(),
  name: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const frames = pgTable('frames', {
  id: serial().primaryKey(),
  sku: text().notNull().default(''),
  brand: text().notNull(),
  model: text().notNull().default(''),
  color: text().notNull().default(''),
  category: text().notNull().default('Optical'),
  price: numeric({ precision: 10, scale: 2 }),
  photoKey: text('photo_key'),
  notes: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const stock = pgTable(
  'stock',
  {
    frameId: integer('frame_id')
      .notNull()
      .references(() => frames.id, { onDelete: 'cascade' }),
    branchId: integer('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    quantity: integer().notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.frameId, t.branchId] })],
)

// Audit trail of who changed what. frameId/branchId are plain columns (no FK)
// so history survives when a frame or branch is deleted.
export const activity = pgTable('activity', {
  id: serial().primaryKey(),
  actor: text().notNull(),
  action: text().notNull(),
  detail: text().notNull(),
  frameId: integer('frame_id'),
  branchId: integer('branch_id'),
  fromQty: integer('from_qty'),
  toQty: integer('to_qty'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
