import { sql } from "drizzle-orm";
import { boolean, date, integer, jsonb, pgEnum, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const adStatus = pgEnum("ad_status", ["draft", "live", "paused", "retired"]);

export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  conceptKey: text("concept_key").notNull().unique(),
  campaign: text("campaign"),
  figmaFileKey: text("figma_file_key"),
  tags: jsonb("tags").$type<{ persona?: string[]; funnel?: string; icp?: string[]; geo?: string[]; [k: string]: unknown }>().default({}),
  copy: jsonb("copy").$type<import("@/lib/ads/types").AdCopy>(),
  art: jsonb("art").$type<import("@/lib/ads/types").AdArtSpec>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One Figma frame = one size of a concept.
export const creatives = pgTable(
  "creatives",
  {
    id: serial("id").primaryKey(),
    conceptId: integer("concept_id").references(() => concepts.id).notNull(),
    figmaNodeId: text("figma_node_id").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    imageUrl: text("image_url"),
    syncedAt: timestamp("synced_at"),
  },
  (t) => [uniqueIndex("creatives_concept_size").on(t.conceptId, t.width, t.height)],
);

export const copyDecks = pgTable("copy_decks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sheetId: text("sheet_id").notNull(),
  tab: text("tab").notNull(),
  columnMap: jsonb("column_map").$type<Record<string, string>>().notNull(),
  syncedAt: timestamp("synced_at"),
});

export const copyRows = pgTable("copy_rows", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").references(() => copyDecks.id).notNull(),
  conceptId: integer("concept_id").references(() => concepts.id),
  adNameBase: text("ad_name_base").notNull(),
  fields: jsonb("fields").$type<Record<string, string>>().notNull(),
});

// A launched creative on a platform; `name` is `{ConceptKey}{MMYYYY}_{W}x{H}` and joins to metrics.
export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  creativeId: integer("creative_id").references(() => creatives.id).notNull(),
  copyRowId: integer("copy_row_id").references(() => copyRows.id),
  name: text("name").notNull().unique(),
  platform: text("platform").notNull(),
  placement: text("placement").notNull(),
  // Creative Score dimensions. adType: Static | Carousel | Display | Native | InMail | Video | CTV | ...
  // stage: Awareness | Interest | Conversion | Re-engage. geo is the ad's primary geo (null = all/unspecified).
  adType: text("ad_type").default("Static").notNull(),
  stage: text("stage"),
  geo: text("geo"),
  status: adStatus("status").default("draft").notNull(),
  launchedAt: date("launched_at"),
  pausedAt: date("paused_at"),
  tags: jsonb("tags").$type<Record<string, unknown>>().default({}),
  composition: jsonb("composition").$type<import("@/lib/composition/types").Composition>(),
});

export const metricsDaily = pgTable(
  "metrics_daily",
  {
    adId: integer("ad_id").references(() => ads.id).notNull(),
    day: date("day").notNull(),
    spend: real("spend").default(0).notNull(),
    impressions: integer("impressions").default(0).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    conversions: integer("conversions").default(0).notNull(),
    videoStarts: integer("video_starts"),
    videoCompletions: integer("video_completions"),
    extra: jsonb("extra").$type<Record<string, number>>().default({}),
    source: text("source").notNull(), // csv | meta | linkedin | google
  },
  (t) => [primaryKey({ columns: [t.adId, t.day] })],
);

export const benchmarks = pgTable("benchmarks", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  funnel: text("funnel").notNull(),
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  direction: text("direction").$type<"higher" | "lower">().default("higher").notNull(),
  tier: text("tier").$type<"primary" | "secondary">().notNull(),
  source: text("source"),
  asOf: date("as_of"),
});

// Creative Score benchmarks: one row per Platform x Ad type x Funnel stage x Geo (geo null = all geos).
// kpis holds cpm ($), and vtr/completion/ctr/convRate as fractions, convPer1k as a count; a missing
// key means that KPI does not apply. Separate from `benchmarks`, which feeds the readiness scorecard.
export const scoreBenchmarks = pgTable(
  "score_benchmarks",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull(),
    adType: text("ad_type").notNull(),
    stage: text("stage").notNull(),
    geo: text("geo"),
    kpis: jsonb("kpis").$type<Record<string, number>>().notNull(),
    dataStatus: text("data_status").$type<"verified" | "placeholder" | "no-delivery">().default("placeholder").notNull(),
    sampleAds: integer("sample_ads"),
    source: text("source"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
  },
  (t) => [uniqueIndex("score_benchmarks_key").on(t.platform, t.adType, t.stage, sql`coalesce(${t.geo}, '')`)],
);

export const scorecards = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => ads.id).notNull(),
  period: text("period").notNull(), // e.g. 2026-Q3
  checks: jsonb("checks").$type<Record<string, boolean | null>>().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("scorecards_ad_period").on(t.adId, t.period)]);

export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  variable: text("variable").notNull(), // headline | imagery | cta | offer | layout
  hypothesis: text("hypothesis").notNull(),
  adA: text("ad_a").notNull(), // ad names
  adB: text("ad_b").notNull(),
  status: text("status").$type<"running" | "concluded">().notNull(),
  startedAt: date("started_at").notNull(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").$type<"generated" | "exported" | "draft">().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  config: jsonb("config").$type<{ concepts: string[]; placements: string[]; deck?: string }>().notNull(),
  adCount: integer("ad_count").notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<"photo" | "product">().notNull(),
  name: text("name").notNull(),
  origin: text("origin").$type<"upload" | "drive" | "figma">().notNull(),
  originRef: jsonb("origin_ref").$type<Record<string, string>>(),
  storageKey: text("storage_key").notNull(),
  storageKind: text("storage_kind").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  approved: boolean("approved").default(false).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
