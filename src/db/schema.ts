import { date, integer, jsonb, pgEnum, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const adStatus = pgEnum("ad_status", ["draft", "live", "paused", "retired"]);

export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  conceptKey: text("concept_key").notNull().unique(),
  campaign: text("campaign"),
  figmaFileKey: text("figma_file_key"),
  tags: jsonb("tags").$type<{ persona?: string[]; funnel?: string; icp?: string[]; geo?: string[]; [k: string]: unknown }>().default({}),
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
  status: adStatus("status").default("draft").notNull(),
  launchedAt: date("launched_at"),
  pausedAt: date("paused_at"),
  tags: jsonb("tags").$type<Record<string, unknown>>().default({}),
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

export const scorecards = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => ads.id).notNull(),
  period: text("period").notNull(), // e.g. 2026-Q3
  checks: jsonb("checks").$type<Record<string, boolean | null>>().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
