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
