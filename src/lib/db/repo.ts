import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as t from "@/db/schema";
import type { AdRecord, AdStatus } from "@/lib/ads/types";
import type { MetricRow, Totals } from "@/lib/metrics/csv";
import type { Benchmark, ManualChecks } from "@/lib/scorecard/build";

// All functions take the db so tests can pass an in-memory instance.
// An ad's id in the UI is its name (`{ConceptKey}{MMYYYY}_{W}x{H}`), which is unique.

export async function listAds(db: Db): Promise<AdRecord[]> {
  const rows = await db
    .select({ ad: t.ads, creative: t.creatives, concept: t.concepts })
    .from(t.ads)
    .innerJoin(t.creatives, eq(t.ads.creativeId, t.creatives.id))
    .innerJoin(t.concepts, eq(t.creatives.conceptId, t.concepts.id));
  return rows.map(({ ad, creative, concept }) => ({
    id: ad.name,
    name: ad.name,
    conceptKey: concept.conceptKey,
    platform: ad.platform as AdRecord["platform"],
    placement: ad.placement,
    width: creative.width,
    height: creative.height,
    status: ad.status,
    launchedAt: ad.launchedAt ?? undefined,
    pausedAt: ad.pausedAt ?? undefined,
    imageUrl: creative.imageUrl ?? undefined,
    tags: { ...(ad.tags as AdRecord["tags"]), persona: (ad.tags as Partial<AdRecord["tags"]>)?.persona ?? [] },
    campaign: concept.campaign ?? undefined,
    copy: concept.copy ?? undefined,
    art: concept.art ?? undefined,
  }));
}

export async function setAdStatus(db: Db, name: string, status: AdStatus, today: string): Promise<boolean> {
  const res = await db
    .update(t.ads)
    .set({ status, pausedAt: status === "paused" ? today : status === "live" ? null : sql`${t.ads.pausedAt}` })
    .where(eq(t.ads.name, name))
    .returning({ id: t.ads.id });
  return res.length > 0;
}

export async function getTotals(db: Db): Promise<Record<string, Totals>> {
  const rows = await db
    .select({
      name: t.ads.name,
      spend: sql<number>`coalesce(sum(${t.metricsDaily.spend}), 0)`.mapWith(Number),
      impressions: sql<number>`coalesce(sum(${t.metricsDaily.impressions}), 0)`.mapWith(Number),
      clicks: sql<number>`coalesce(sum(${t.metricsDaily.clicks}), 0)`.mapWith(Number),
      conversions: sql<number>`coalesce(sum(${t.metricsDaily.conversions}), 0)`.mapWith(Number),
    })
    .from(t.metricsDaily)
    .innerJoin(t.ads, eq(t.metricsDaily.adId, t.ads.id))
    .groupBy(t.ads.name);
  return Object.fromEntries(rows.map(({ name, ...totals }) => [name, totals]));
}

export interface ImportSummary {
  imported: number;
  unmatchedNames: string[];
}

/** Upserts daily rows by (ad, day). Sample rows for the touched ads are replaced by real data. */
export async function importMetricRows(db: Db, rows: MetricRow[], source = "csv"): Promise<ImportSummary> {
  const names = [...new Set(rows.map((r) => r.adName))];
  const ads = names.length ? await db.select({ id: t.ads.id, name: t.ads.name }).from(t.ads).where(inArray(t.ads.name, names)) : [];
  const idByName = new Map(ads.map((a) => [a.name, a.id]));
  const matched = rows.filter((r) => idByName.has(r.adName));

  await db.transaction(async (tx) => {
    if (ads.length) await tx.delete(t.metricsDaily).where(and(inArray(t.metricsDaily.adId, ads.map((a) => a.id)), eq(t.metricsDaily.source, "sample")));
    for (const r of matched) {
      const v = { adId: idByName.get(r.adName)!, day: r.day, spend: r.spend, impressions: r.impressions, clicks: r.clicks, conversions: r.conversions, source };
      await tx.insert(t.metricsDaily).values(v).onConflictDoUpdate({ target: [t.metricsDaily.adId, t.metricsDaily.day], set: v });
    }
  });
  return { imported: matched.length, unmatchedNames: names.filter((n) => !idByName.has(n)) };
}

export async function getBenchmarks(db: Db): Promise<Benchmark[]> {
  const rows = await db.select().from(t.benchmarks);
  return rows.map((b) => ({ platform: b.platform, funnel: b.funnel, metric: b.metric as Benchmark["metric"], value: b.value, direction: b.direction, tier: b.tier, source: b.source ?? undefined }));
}

export async function getChecks(db: Db, period: string): Promise<Record<string, ManualChecks>> {
  const rows = await db
    .select({ name: t.ads.name, checks: t.scorecards.checks })
    .from(t.scorecards)
    .innerJoin(t.ads, eq(t.scorecards.adId, t.ads.id))
    .where(eq(t.scorecards.period, period));
  return Object.fromEntries(rows.map((r) => [r.name, r.checks as ManualChecks]));
}

export async function saveChecks(db: Db, name: string, period: string, checks: ManualChecks): Promise<boolean> {
  const [ad] = await db.select({ id: t.ads.id }).from(t.ads).where(eq(t.ads.name, name));
  if (!ad) return false;
  await db
    .insert(t.scorecards)
    .values({ adId: ad.id, period, checks })
    .onConflictDoUpdate({ target: [t.scorecards.adId, t.scorecards.period], set: { checks } });
  return true;
}

/** Calendar quarter label, e.g. 2026-Q4. */
export function periodFor(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${y}-Q${Math.ceil(m / 3)}`;
}

export interface DailyPoint {
  adName: string;
  day: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

/** Every daily metric row (the dummy dataset is a few thousand rows). */
export async function getDailyMetrics(db: Db): Promise<DailyPoint[]> {
  const rows = await db
    .select({ adName: t.ads.name, day: t.metricsDaily.day, spend: t.metricsDaily.spend, impressions: t.metricsDaily.impressions, clicks: t.metricsDaily.clicks, conversions: t.metricsDaily.conversions })
    .from(t.metricsDaily)
    .innerJoin(t.ads, eq(t.metricsDaily.adId, t.ads.id))
    .orderBy(t.metricsDaily.day);
  return rows;
}

export async function listExperiments(db: Db) {
  return db.select().from(t.experiments).orderBy(sql`${t.experiments.startedAt} desc`);
}

export async function listBatches(db: Db) {
  return db.select().from(t.batches).orderBy(sql`${t.batches.createdAt} desc`);
}

export async function updateAdTags(db: Db, name: string, tags: AdRecord["tags"]): Promise<boolean> {
  const res = await db.update(t.ads).set({ tags }).where(eq(t.ads.name, name)).returning({ id: t.ads.id });
  return res.length > 0;
}

export interface NewBatchAd {
  conceptKey: string;
  placement: string;
  platform: string;
  width: number;
  height: number;
  name: string;
  tags: AdRecord["tags"];
}

/** Creates a draft batch: ensures each concept has creatives and inserts draft ads for the chosen sizes. */
export async function createBatch(
  db: Db,
  input: { name: string; createdBy: string; ads: NewBatchAd[]; concepts: { key: string; campaign?: string; copy?: AdRecord["copy"]; art?: AdRecord["art"]; tags: AdRecord["tags"] }[]; placements: string[] },
): Promise<{ batchId: number; created: number; skipped: string[] }> {
  return db.transaction(async (tx) => {
    const conceptIds = new Map<string, number>();
    for (const c of input.concepts) {
      const [row] = await tx
        .insert(t.concepts)
        .values({ conceptKey: c.key, campaign: c.campaign, copy: c.copy, art: c.art, tags: c.tags })
        .onConflictDoUpdate({ target: t.concepts.conceptKey, set: { campaign: c.campaign ?? sql`${t.concepts.campaign}` } })
        .returning({ id: t.concepts.id });
      conceptIds.set(c.key, row.id);
    }
    let created = 0;
    const skipped: string[] = [];
    for (const a of input.ads) {
      const [exists] = await tx.select({ id: t.ads.id }).from(t.ads).where(eq(t.ads.name, a.name));
      if (exists) { skipped.push(a.name); continue; }
      const [creative] = await tx
        .insert(t.creatives)
        .values({ conceptId: conceptIds.get(a.conceptKey)!, figmaNodeId: `batch:${a.conceptKey}:${a.width}x${a.height}`, width: a.width, height: a.height })
        .onConflictDoUpdate({ target: [t.creatives.conceptId, t.creatives.width, t.creatives.height], set: { syncedAt: new Date() } })
        .returning({ id: t.creatives.id });
      await tx.insert(t.ads).values({ creativeId: creative.id, name: a.name, platform: a.platform, placement: a.placement, status: "draft", tags: a.tags });
      created++;
    }
    const [batch] = await tx
      .insert(t.batches)
      .values({ name: input.name, status: "generated", createdBy: input.createdBy, adCount: created, config: { concepts: input.concepts.map((c) => c.key), placements: input.placements } })
      .returning({ id: t.batches.id });
    return { batchId: batch.id, created, skipped };
  });
}
