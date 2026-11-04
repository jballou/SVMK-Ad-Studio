import { count } from "drizzle-orm";
import type { Db } from "./index";
import * as t from "./schema";
import { THEMES } from "@/lib/dummy/concepts";
import { generateDummyData } from "@/lib/dummy/generate";

/** Realistic dummy data for local development. Metric rows are tagged source "sample" so they can be purged. */
export async function seedIfEmpty(db: Db) {
  const [{ n }] = await db.select({ n: count() }).from(t.ads);
  if (n > 0) return;
  const data = generateDummyData();

  const conceptIds = new Map<string, number>();
  for (const c of data.concepts) {
    const theme = THEMES[c.theme];
    const [row] = await db
      .insert(t.concepts)
      .values({
        conceptKey: c.key,
        campaign: c.campaign,
        tags: { persona: c.personas, funnel: c.funnel, icp: c.icp, offer: c.offer },
        copy: { headline: c.headline, intro: c.intro, platformHeadline: c.platformHeadline, cta: c.cta, landing: c.landing },
        art: { ...theme, layout: c.layout },
      })
      .returning({ id: t.concepts.id });
    conceptIds.set(c.key, row.id);
  }

  const conceptByKey = new Map(data.concepts.map((c) => [c.key, c]));
  const adIds = new Map<string, number>();
  for (const a of data.ads) {
    const concept = conceptByKey.get(a.conceptKey)!;
    const [creative] = await db
      .insert(t.creatives)
      .values({ conceptId: conceptIds.get(a.conceptKey)!, figmaNodeId: `sample:${a.conceptKey}:${a.width}x${a.height}`, width: a.width, height: a.height })
      .onConflictDoUpdate({ target: [t.creatives.conceptId, t.creatives.width, t.creatives.height], set: { syncedAt: null } })
      .returning({ id: t.creatives.id });
    const [ad] = await db
      .insert(t.ads)
      .values({
        creativeId: creative.id, name: a.name, platform: a.platform, placement: a.placement, status: a.status,
        launchedAt: a.launchedAt ?? null, pausedAt: a.pausedAt ?? null,
        tags: { persona: concept.personas, funnel: concept.funnel, icp: concept.icp, geo: a.geo, offer: concept.offer },
      })
      .returning({ id: t.ads.id });
    adIds.set(a.name, ad.id);
  }

  for (let i = 0; i < data.daily.length; i += 1000) {
    await db.insert(t.metricsDaily).values(
      data.daily.slice(i, i + 1000).map((d) => ({ adId: adIds.get(d.adName)!, day: d.day, spend: d.spend, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions, source: "sample" })),
    );
  }

  await db.insert(t.benchmarks).values(data.benchmarks.map((b) => ({ ...b, asOf: data.today })));
  await db.insert(t.experiments).values(data.experiments);
  await db.insert(t.batches).values(
    data.batches.map((b) => ({ name: b.name, status: b.status, createdBy: b.createdBy, createdAt: new Date(b.createdAt), adCount: b.adCount, config: { concepts: b.concepts, placements: b.placements } })),
  );
}
