# SVMK Ad Studio

Remix, preview, track and score static paid ads from Figma templates and a copy deck.
Scope: static ads for LinkedIn, Meta (Facebook, Instagram, Threads), Google Display and newsletter placements.

> Everything in the UI currently runs on **realistic dummy data** (~170 ads, six months of daily metrics). Figma export, Google Sheets sync and the platform APIs are built or specified but not connected.

## Screens
| Area | Route | What it does |
|---|---|---|
| Dashboard | `/` | 30-day KPIs vs prior period, CTR by platform, scorecard health, top performers, fatigue alerts, refresh candidates, recent batches |
| Ad gallery | `/gallery` | Grid / gallery / list views, search, filters (platform, status, persona, funnel), sort, bulk select to export, inline status changes |
| Ad detail | `/gallery/[name]` | Creative inside its platform UI (all Meta placements), metrics, rolling CTR, scorecard, copy with char limits, editable tags, pause/resume |
| New batch | `/batches/new` | 5-step wizard: Figma template and concepts, copy deck (validated, editable), placements, **visual design editor**, review and generate |
| Batches | `/batches` | History of generated batches |
| Analytics | `/performance/*` | Overview with winners/losers; platforms, placements and sizes; creatives and tag breakdowns; A/B tests with significance; fatigue |
| Scorecards | `/scorecards` | 45-point scoring, bands, "Too early" learning gate, manual checks, CSV import |
| Export | `/export` | Select ads, format/resolution/folder structure, real CSV manifest download, simulated package build, history |
| Library | `/library` | Figma templates with sync, copy decks with validation, naming scheme, placement specs |
| Settings | `/settings/*` | Integrations and what each needs, benchmarks (editable), scorecard rules (learning gate), tag taxonomy, team |

## Design editor (batch step 4)
- Layers: Background (preset fills), Photo and Product. Each can be turned on or off and reordered; a concept's template enables up to two of the imagery layers. Headline, CTA and the locked brand mark sit on top.
- Imagery comes from the approved library (generated placeholders for now) or an upload. Drag to move, arrow keys or the nudge pad to fine-tune, slider or +/- to resize. Positions are per size, with "apply to similar sizes".
- QA rules run for every size (`src/lib/composition/qa.ts`) and again on the server when a batch is generated. Examples: LinkedIn/Meta add their own CTA so the image shouldn't carry one; Display and newsletter must; Stories/Reels safe zones; contrast; text fit; hidden or cropped layers; unapproved or low-resolution uploads. Errors block the batch; warnings don't. Many issues have a one-click fix, and most can be fixed across all sizes at once.
- Compositions are stored per ad (`ads.composition`) and rendered everywhere by `CompositionArt`.

### Image storage and imports
Images you bring in (upload, Google Drive, Figma) go through one pipeline (`src/lib/assets`): the bytes are sniffed and validated (PNG, JPG or WebP; up to 4 MB and 8000px; SVG is refused), saved to storage, and recorded in the `assets` table as **unapproved**. They are served only through `/api/assets/[id]`; an admin approves them in **Library**, which removes the "needs brand review" warning.

| Setting | What it enables |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (private access). Create a Blob store in the project's Storage tab, or run `vercel storage` and connect it to the project; the token is added for you. Locally, run `vercel env pull .env.local`. |
| *(no token, local dev)* | Files are stored under `.data/uploads/` instead. |
| *(no token, on Vercel)* | Storage is off: uploads stay in the browser session and generated ads show a placeholder. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Drive import (read-only). Share the file or folder with the service account's `client_email`; paste the link in the picker. Also used for copy-deck sheets. |
| `FIGMA_TOKEN` | Figma import: paste a link to a frame or layer (it must include `node-id`); it is rendered to PNG at up to 2x and saved. |

On the hosted demo (no `DATABASE_URL`) the in-memory database resets, so stored image records, and therefore the images, don't last. Connect a real Postgres alongside Blob.

## Figma naming scheme
- Page = campaign, section = concept, frame = one size.
- Frame: `AD | {ConceptKey} | {W}x{H}` (e.g. `AD | YourBrand | 1200x1200`).
- Editable slot layers are prefixed `#`: `#headline`, `#subhead`, `#stat`, `#cta`, `#hero`, `#product`, `#logo`, `#bg`. Optional char limit: `#headline[40]`. Layers without `#` are locked.
- `#logo` is an instance of a Logo component with a `Color` variant: Green (default), White (for dark backgrounds) or Green 900 (sparingly). Required slots: `#headline`, `#bg`, `#logo`. `#cta` is required on Display and newsletter frames and should be absent on LinkedIn and Meta frames.
- Check a template with `FIGMA_TOKEN=... npm run figma:check -- "<link to the page or section>"`, or paste the link into Library > Check a Figma template.
- Platform ad name / export filename: `{ConceptKey}{MMYYYY}_{W}x{H}`. This is the join key for performance data. If the same size runs on two platforms the file (and name) is shared.

## Layout
- `src/app`: routes. Pages that read the database use `connection()` + `Suspense` (Cache Components).
- `src/components`: `shell` (nav), `ui` (button, chip, primitives, tabs), `charts` (SVG line/bar/sparkline), `ads` (generated creative art, badges, platform previews), `mockups`, feature folders.
- `src/lib/analytics`: aggregation, fatigue detection, A/B z-test, scorecard rollups. `src/lib/scorecard`: scoring and the learning gate. `src/lib/figma`: frame/slot parsing and REST client. `src/lib/copydeck`, `src/lib/metrics`, `src/lib/export`, `src/lib/batches`: parsing, validation, planning.
- `src/lib/dummy`: deterministic dummy dataset generator (seeded RNG) used to seed the database.
- `src/db`: Drizzle schema, client, seed. `drizzle/`: migrations.

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run typecheck
npm run lint
```
- **Database:** with `DATABASE_URL` unset, local dev uses an embedded Postgres (PGlite) in `.data/` (git-ignored), migrated and seeded on first use. `npm run db:reset` wipes it so it reseeds (do this after changing the dummy data or schema).
- **Vercel without `DATABASE_URL`:** falls back to an in-memory demo database seeded on every cold start. Changes reset and are not shared across serverless instances. Set `DATABASE_URL` to a Postgres and run `npm run db:migrate` for anything real.
- **Schema changes:** edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.
- **Figma:** `FIGMA_TOKEN=... npm run figma:discover -- "<figma url with node-id>" [--legacy]` lists frames and slots.

## Known gaps
- Images are generated placeholders; Figma PNG export is not wired to storage, so export packages are simulated (the CSV manifest is real).
- Placement specs other than Threads are not yet verified against the platforms' own docs (`verifiedOn: null`). Newsletter sizes are placeholders.
- Benchmarks are sample values. Platform APIs (Meta, LinkedIn, Google Ads) are not connected; use CSV import.
- No authentication yet (planned: company SSO on the team Vercel account).
