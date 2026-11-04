import { count } from "drizzle-orm";
import type { Db } from "./index";
import * as t from "./schema";
import { SEED_ADS } from "@/lib/ads/seed";
import { SAMPLE_BENCHMARKS, SAMPLE_TOTALS } from "@/lib/scorecard/sample";

/** Sample data for local development. Rows are tagged source "sample" so they can be purged. */
export async function seedIfEmpty(db: Db) {
  const [{ n }] = await db.select({ n: count() }).from(t.ads);
  if (n > 0) return;

  const conceptIds = new Map<string, number>();
  for (const key of new Set(SEED_ADS.map((a) => a.conceptKey))) {
    const first = SEED_ADS.find((a) => a.conceptKey === key)!;
    const [row] = await db.insert(t.concepts).values({ conceptKey: key, tags: first.tags }).returning({ id: t.concepts.id });
    conceptIds.set(key, row.id);
  }

  for (const a of SEED_ADS) {
    const [creative] = await db
      .insert(t.creatives)
      .values({ conceptId: conceptIds.get(a.conceptKey)!, figmaNodeId: `sample:${a.name}`, width: a.width, height: a.height })
      .onConflictDoUpdate({ target: [t.creatives.conceptId, t.creatives.width, t.creatives.height], set: { syncedAt: null } })
      .returning({ id: t.creatives.id });
    const [ad] = await db
      .insert(t.ads)
      .values({ creativeId: creative.id, name: a.name, platform: a.platform, placement: a.placement, status: a.status, launchedAt: a.launchedAt ?? null, pausedAt: a.pausedAt ?? null, tags: a.tags })
      .returning({ id: t.ads.id });
    const totals = SAMPLE_TOTALS[a.name];
    if (totals && a.launchedAt) {
      await db.insert(t.metricsDaily).values({ adId: ad.id, day: a.launchedAt, ...totals, source: "sample" });
    }
  }

  await db.insert(t.benchmarks).values(
    SAMPLE_BENCHMARKS.map((b) => ({ platform: b.platform, funnel: b.funnel, metric: b.metric, value: b.value, direction: b.direction, tier: b.tier, source: "sample" })),
  );
}
