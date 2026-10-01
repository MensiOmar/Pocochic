# POCOCHIC — session brief

Tunisian fashion/accessories brand site. Replaces the live AppSheet app. Currency TND. Locales `fr` | `ar` | `en`. Guest checkout, cash on delivery, no customer accounts.

## Layout

Workspace root (this file’s folder) is **not** the git repo. The git/product repo is `pocochic/`.

| Path | What |
|------|------|
| `obsidian/` | Project brain. Start at `obsidian/00-Home.md`. |
| `pocochic/` | npm workspaces monorepo (git root). |
| `pocochic/frontend/shop-web` | Customer Vue 3 + Vite + Vue Router SPA. |
| `pocochic/frontend/admin-web` | Staff orders Vue SPA (separate app/URL). |
| `pocochic/frontend/assets/` | Logos + backgrounds. |
| `pocochic/backend/shop-api` | Hono Worker — catalog, checkout, promos, geo, thank-you. |
| `pocochic/backend/admin-api` | Hono Worker — session + orders. |
| `pocochic/backend/db` | Drizzle schema, migrations, `commerce.ts`, import script. |
| `pocochic/backend/contracts` | Shared Zod types. |
| `pocochic/data/import/` | CSV snapshot the importer uses. |
| `pocochic/data/objects/catalog/styles/` | Catalog WebPs. |
| `pocochic/data/pocochic.db` | Local SQLite. |
| `appshet data/` | Downloaded Google Sheet CSVs. No live Sheets client. |
| `Application Documentation.pdf` | AppSheet as-is export. |
| `obsidian/03-Brand/Screen-Designs.md` | Drop zone for owner HTML screens. |

## Stack (locked)

- Frontend: Vue 3 + Vite + Vue Router + TypeScript → Cloudflare Pages.
- API: TypeScript + Hono → two Cloudflare Workers.
- DB: Cloudflare D1 (SQLite file locally). Files: R2 (MinIO locally).
- Package manager: **npm only**, exact versions (no `^`/`~`). Node ≥ 22.
- Money: `price_cents` INTEGER. Flags: `0/1`. Timestamps: UTC ISO TEXT. IDs: TEXT ULID from the Worker.
- Commerce (`quotePromo`, `placeOrder`, `transitionOrder`) lives in `pocochic/backend/db/src/commerce.ts`. Vue does not reimplement stock or promo math.
- Cart: `localStorage` key `pocochic.cart.v1`, clear only after checkout HTTP 201.
- Hard no: Next.js, Flyway on D1, PDF/Chromium in Workers.

Details: `obsidian/05-Architecture/Stack.md`, data: `obsidian/02-Current-System/Data-Model.md`.

## How we build

1. Owner delivers **HTML screen files**. Implement them in `shop-web` / `admin-web`.
2. Product rules (stock, promos, statuses, checkout) come from the vault + APIs, not from guessing.
3. Backend/schema changes only when a screen or a product rule needs them.
4. Verify shop/admin in the browser when UI changes.

Do not invent an alternate stack. Do not call live Google Sheets.

## Commands (cwd = `pocochic/`)

```bash
npm ci
docker compose up -d
npm run dev                 # APIs + both Vite apps
npm test --workspaces --if-present
npx vite-node backend/db/scripts/import-v1.ts
```

Shop Vite `5173`, admin Vite `5174`, shop-api `8787`, admin-api `8788`, Datasette `8080`, MinIO `9000`/`9001`.

Secrets: `pocochic/.env` (copy from `.env.example`). Never commit it.

## Git

Commit format: `<type>: <ticket-id> — <description>`  
Types: `feat` `fix` `docs` `style` `refactor` `test` `chore`. One commit per ticket when tickets exist.

## Skills

Project skills under `.grok/skills/` (also copied into `pocochic/.grok/skills/` for git-root sessions).

| Skill | When |
|-------|------|
| `/grill-me` | Stress-test an idea before building. You invoke it; it does not auto-fire. |
| `/html-to-vue` | Owner dropped HTML; implement it in the Vue apps. |
| `/vault-context` | Need product/as-is facts from `obsidian/` without dumping the vault. |
