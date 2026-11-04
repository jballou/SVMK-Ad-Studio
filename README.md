# SVMK Ad Studio

Remix, preview, track and score static paid ads from Figma templates and a copy deck.
v1 scope: static ads for LinkedIn, Meta, Google Display and newsletter.

## Figma naming scheme
- Page = campaign, section = concept, frame = one size.
- Frame: `AD | {ConceptKey} | {W}x{H}` (e.g. `AD | YourBrand | 1200x1200`).
- Editable slot layers are prefixed `#`: `#headline`, `#subhead`, `#stat`, `#cta`, `#hero`, `#logo`, `#bg`.
  Optional char limit: `#headline[40]`. Layers without `#` are locked.
- Platform ad name / export filename: `{ConceptKey}{MMYYYY}_{W}x{H}` (join key for performance data).

## Layout
- `src/lib/figma`: frame/slot/ad-name parsing
- `src/lib/specs`: placement spec data (`verifiedOn: null` = not yet checked against platform docs)
- `src/lib/scorecard`: 45-pt scoring, bands, learning-phase gate
- `src/db/schema.ts`: Drizzle schema (Postgres)

## Build order
1. Scaffold + schema (done)
2. Figma sync  3. Copy deck import + LinkedIn mockup  4. Meta placement matrix + mockups
5. Gallery, tagging, status  6. Metrics CSV, benchmarks, scorecards  7. API connectors, in-image remix

## Dev
`npm run dev`, `npm test`, `npm run typecheck`. Copy `.env.example` to `.env.local`.
