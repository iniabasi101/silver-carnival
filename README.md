# Frame Inventory

A small, spreadsheet-style inventory site for an eye clinic. Staff add the frames the clinic carries (brand, model, code, colour, category, price and a photo), and each branch has its own quantity column where they keep their stock count up to date.

## Features

- **Spreadsheet view** – one row per frame, one column per branch, plus a total. Click a quantity to type a new number, or use the − / + buttons. Changes save instantly.
- **Branch tabs** – switch to a single branch to see and edit only that branch's stock, with larger controls.
- **Frames with photos** – add or edit frames in a dialog; photos are uploaded and served resized.
- **Search & filters** – search by brand, model, code or colour, filter by category, or show low-stock frames only (2 or fewer). Out-of-stock cells are highlighted.
- **Branch management** – add, rename or remove branches.
- **CSV export** – download the current view to open in Excel or Google Sheets.

## Tech

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions)
- Netlify Database (managed Postgres) with Drizzle ORM for frames, branches and stock counts
- Netlify Blobs for frame photos, served through Netlify Image CDN
- Tailwind CSS 4 + hand-written CSS in `src/styles.css`

## Running locally

```bash
pnpm install
netlify dev
```

`netlify dev` provides local emulation of Netlify Database and Blobs. Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy.

After changing `db/schema.ts`, generate a migration:

```bash
npx drizzle-kit generate --name <describe_change>
```
