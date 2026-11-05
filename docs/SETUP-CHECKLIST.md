# Ad Studio setup checklist

Living list. Last updated 2026-11-05. Priority: **P0** blocks launch, **P1** needed soon after, **P2** nice to have. Mark items `[x]` as they land and add new ones at the bottom of each section.

## A. Creative team: what to make

### Templates (designers)
- [ ] **P0** Build the 8 intent templates, each in every size it needs: Lifestyle impact, Product feature spotlight, Product in use, Stat / proof point, Customer quote, Offer / promo, Report / download, Event / webinar. Until the template editor ships, build them as Figma frames (`AD | Name | WxH`, slots `#bg #headline #logo` required, `#subhead #stat #cta #hero #product` optional) and run `npm run figma:check`.
- [ ] **P0** For each template, document: when to use it, which funnel stage it fits, text limits per slot, which imagery layers it supports (photo / product), and what users may and may not change.
- [ ] **P0** Sizes to cover:
  - LinkedIn: 1200x1200, 1200x628, 720x900
  - Meta: 1080x1080, 1080x1350, 1080x1920, 1200x628
  - Threads: 1080x1080, 1080x1350, 1200x628
  - Google Display: 300x250, 336x280, 728x90, 300x600, 320x50, 320x100, 160x600, 970x250
  - Newsletter: sizes pending vendor specs (see below)
- [ ] **P1** Per-size layout variants where one layout does not scale (728x90, 320x50, 1080x1920 safe zones).
- [ ] **P1** Review a sample of generated ads from every template on every platform and sign off (or send back).

### Brand and rules
- [ ] **P0** Logo files for the three variants: Green (default), White (optional), Green 900 (sparingly), plus clear-space and minimum-size rules.
- [ ] **P0** Licensed web fonts (and their license terms for server-side rendering).
- [ ] **P0** Confirm brand color tokens and the approved background presets.
- [ ] **P1** CTA vocabulary (approved button text) and headline length limits per platform.
- [ ] **P1** Contrast and legibility rules the QA panel should enforce (text on photo, scrim use).
- [ ] **P1** Do / don't examples per intent template.

### Approved imagery library
- [ ] **P0** Lifestyle photography by persona (CX, EX, Marketing, IT, Enterprise), diverse and rights-cleared.
- [ ] **P0** Product imagery: cropped UI screenshots and device frames for each key product (min 2,000px on the long edge; PNG, JPG or WebP, 4 MB max each).
- [ ] **P1** Record license, usage period and credit for every image, and mark approved items in the Library.
- [ ] **P1** Retire or flag outdated product UI.

### Copy and tagging
- [ ] **P0** Standard copy deck layout (one row per campaign: ad name base, headline, intro, platform headline, CTA, landing page, persona, funnel, ICP, geo, offer) with character limits per platform.
- [ ] **P0** Confirm the tag lists in Settings: personas, funnel stages, ICPs, geos, offers.
- [ ] **P1** Agree how new geos are added and who may add them.
- [ ] **P1** Write the template and intent descriptions users will see in the gallery.

### Naming and process
- [ ] **P0** Decide the ad naming standard with the head of ad program. Today: `{ConceptKey}{MMYYYY}_{W}x{H}`. Her sheet: `LI_Video_117TheAnthem032026_Design_Video_1920x1080_Mar_V2`. Settle fields (platform, ad type, concept, month, size, version, team/format token) and whether the template name appears in the filename.
- [ ] **P0** Brand Creative Hub: confirm the new-project URL for the "Request custom ad" button, the intake fields, and the turnaround time.
- [ ] **P1** Define who can create or edit templates (Designers) and who can only use them (Users).
- [ ] **P1** Verify platform specs from each platform's own docs. Only Threads is verified; Facebook, Instagram, Stories/Reels, LinkedIn and Display are not.
- [ ] **P1** Collect newsletter placement specs from each vendor (slot sizes, file limits).
- [ ] **P2** Keep platform UI mockups (feed chrome around the ad) current.

## B. Ad ops and media team: data and connectors

### Performance data (daily, per ad)
- [ ] **P0** A daily feed or export with: date, ad name (exactly matching our naming standard), platform, ad set, spend, impressions, clicks, conversions.
- [ ] **P0** Video fields: video starts and video completions (needed for VTR and completion rate on video and CTV).
- [ ] **P0** Funnel stage and ad type on every row. Today the sheet derives them from ad-set name tokens (Static / Video / CTV / Carousel; Awareness / Interest / Consideration / Re-engage); the feed should carry them as real fields.
- [ ] **P0** Geo on every row, so scores and benchmarks can be separated by geo.
- [ ] **P1** Ad status (live, paused, ended) and pause dates, so the gallery stays correct without manual updates.
- [ ] **P1** Historical backfill of at least 6 months, with old names mapped to the current standard.

### Connectors (confirm source of truth first: platform APIs, a warehouse table, or Abacus)
- [ ] **P0** Decide the single source of truth for performance data and who owns it.
- [ ] **P0** LinkedIn Marketing API: read-only access to ad set and creative performance plus conversions (API access approval can take weeks; start early).
- [ ] **P0** Meta Marketing API: read-only access covering Facebook, Instagram and Threads placement breakdown.
- [ ] **P1** Google Ads API: read-only access for Display.
- [ ] **P1** Newsletter vendors: delivery, click and conversion reports (format and cadence).
- [ ] **P1** YouTube / CTV platforms, if those ad types are scored.
- [ ] **P1** Check whether Workato can run the scheduled pulls (ask in `/automationhub`) instead of building direct API jobs.
- [ ] **P1** Name an owner for tokens and service accounts, and a rotation plan.

### Benchmarks and definitions
- [ ] **P0** Verified benchmarks to replace placeholders. Only LinkedIn is verified today. Needed: Meta, Display, newsletter, and any video / CTV types. Per row: platform, ad type, funnel stage, geo, KPI values, sample size, source, date range.
- [ ] **P0** Per-geo benchmarks for every geo we run, and a decision on which fallback applies when a geo has none.
- [ ] **P0** Conversion definition per stage and platform (which event counts, attribution window, de-duplication).
- [ ] **P1** Benchmark refresh cadence (rolling 90 days?) and minimum sample size per row.
- [ ] **P1** Confirm the scoring weights for Conversion and Re-engage stages, which ad types count as video, and the 10,000-impression minimum.
- [ ] **P1** Confirm how "Consideration" campaigns map to the model's Interest and Conversion stages.
- [ ] **P1** Define what "Scale" means per channel (paid social cannot weight budget per creative).
- [ ] **P1** CTV: provide conversions per 1,000 impressions, since clicks are near zero.

### Naming discipline in the platforms
- [ ] **P0** Creative, ad and ad-set names in every platform follow the agreed standard so uploads join to ads automatically.
- [ ] **P1** A short written guide for media buyers on the naming tokens.

## C. Platform and access (route IT questions to #ithelp)
- [ ] **P0** Move hosting from the personal Vercel Hobby account to the company Vercel team.
- [ ] **P0** Hosted Postgres (`DATABASE_URL`) and Vercel Blob store for images. Until then the hosted site resets its data.
- [ ] **P0** Sign-in (company SSO) and Designer / User roles. There is no authentication today.
- [ ] **P1** Figma token (`FIGMA_TOKEN`) and a Google service account for Drive import, owned by the team rather than an individual.
- [ ] **P1** Security review of the data stored and who can access it (security routing is not yet defined).
- [ ] **P2** Move this checklist to Curiosity Central once the owners are set.
