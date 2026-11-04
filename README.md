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
| New batch | `/batches/new` | 5-step wizard: Figma template and concepts, copy deck (validated, editable), placements, preview, review and generate |
| Batches | `/batches` | History of generated batches |
| Analytics | `/performance/*` | Overview with winners/losers; platforms, placements and sizes; creatives and tag breakdowns; A/B tests with significance; fatigue |
| Scorecards | `/scorecards` | 45-point scoring, bands, "Too early" learning gate, manual checks, CSV import |
| Export | `/export` | Select ads, format/resolution/folder structure, real CSV manifest download, simulated package build, history |
| Library | `/library` | Figma templates with sync, copy decks with validation, naming scheme, placement specs |
| Settings | `/settings/*` | Integrations and what each needs, benchmarks (editable), scorecard rules (learning gate), tag taxonomy, team |

## Figma naming scheme
- Page = campaign, section = concept, frame = one size.
- Frame: `AD | {ConceptKey} | {W}x{H}` (e.g. `AD | YourBrand | 1200x1200`).
- Editable slot layers are prefixed `#`: `#headline`, `#subhead`, `#stat`, `#cta`, `#hero`, `#logo`, `#bg`. Optional char limit: `#headline[40]`. Layers without `#` are locked.
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
