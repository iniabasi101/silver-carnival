# AGENTS.md

Frame Inventory: a spreadsheet-style stock tracker for an eye clinic's eyewear frames across multiple branches. Built with TanStack Start, deployed on Netlify.

## Architecture

- **UI** – a single route (`src/routes/index.tsx`) renders the whole app: stats, branch tabs, toolbar, and the sheet table. Its loader calls `getInventory()`; after structural changes (add/edit/delete frames or branches) the page calls `router.invalidate()` to reload. Quantity edits are optimistic: local state updates first, and rolls back with a toast if the save fails.
- **Server functions** – `src/server/inventory.functions.ts` holds all DB reads/writes via `createServerFn` with `.inputValidator(...)` (never `.validator`). Input is trimmed/validated there.
- **Database** – Netlify Database + Drizzle (`drizzle-orm@beta`, `drizzle-kit@beta`). Schema in `db/schema.ts`, client in `db/index.ts`, migrations in `netlify/database/migrations/` (generated with `npx drizzle-kit generate --name <name>`, never applied manually).
  - `branches` – clinic locations.
  - `frames` – products (brand, model, sku, color, category, price, photo_key, notes).
  - `stock` – quantity per (frame_id, branch_id), composite PK, cascades on delete. Missing rows mean 0. Writes are upserts.
- **Photos** – `netlify/functions/photos.ts` (`POST /api/photos` multipart upload → `{ key }`, `GET /api/photos/:key`), stored in the `frame-photos` Blobs store. The UI always displays them through Netlify Image CDN via `photoUrl()` in `src/components/photo.ts`.

## Key directories

```
db/                         Drizzle schema + client
netlify/database/migrations Generated SQL migrations
netlify/functions/          Photo upload/serve function
src/routes/                 __root.tsx (shell, meta, fonts) and index.tsx (the sheet)
src/components/             QuantityCell, FrameDialog, BranchDialog, photo helper
src/server/                 Server functions
src/styles.css              Design tokens (CSS variables) and all component styles
```

## Conventions

- Styling uses plain class names defined in `src/styles.css` with CSS variables (`--paper`, `--ink`, `--accent`, …); fonts are IBM Plex Sans/Mono. Keep the clean, clinical spreadsheet look.
- Dialogs use the native `<dialog>` element.
- Low stock threshold is `<= 2` (amber); `0` is out of stock (red). Defined in `QuantityCell.tsx` and the "Low stock only" filter in `index.tsx`.
- Imports use the `@/` alias for `src/`; DB imports use relative paths with `.js` extensions.
- There is no authentication yet — anyone with the URL can edit. If access control is needed, add Netlify Identity (see the `netlify-identity` skill).
