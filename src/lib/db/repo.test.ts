import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import { generateDummyData } from "@/lib/dummy/generate";
import { ensureStarterTemplates, listTemplates, deleteScoreBenchmark, getRawInputs, getScoreConfig, listScoreBenchmarks, saveScoreConfig, upsertScoreBenchmark, addBenchmark, createBatch, deleteBenchmark, getBenchmarks, getGate, getTaxonomy, listBenchmarkRows, saveGate, saveTaxonomy, getChecks, getDailyMetrics, getTotals, importMetricRows, listAds, listBatches, listExperiments, periodFor, saveChecks, setAdStatus, updateAdTags } from "./repo";

vi.mock("server-only", () => ({}));

const data = generateDummyData();
let db: Db;
beforeAll(async () => {
  const d = drizzle(new PGlite(), { schema });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedIfEmpty(db);
  await seedIfEmpty(db); // idempotent
}, 60_000);

const live = () => data.ads.find((a) => a.status === "live" && a.platform === "linkedin")!;

describe("seed + listAds", () => {
  it("round-trips the dummy ads once, with copy and art", async () => {
    const ads = await listAds(db);
    expect(ads).toHaveLength(data.ads.length);
    const src = live();
    const a = ads.find((x) => x.name === src.name)!;
    expect(a).toMatchObject({ platform: "linkedin", width: src.width, height: src.height, status: "live", conceptKey: src.conceptKey });
    expect(a.tags.persona.length).toBeGreaterThan(0);
    expect(a.copy?.headline).toBeTruthy();
    expect(a.art?.bg).toMatch(/^#/);
  });
  it("loads supporting tables", async () => {
    expect((await getBenchmarks(db)).length).toBe(data.benchmarks.length);
    expect((await listExperiments(db)).length).toBe(data.experiments.length);
    expect((await listBatches(db)).length).toBe(data.batches.length);
    expect((await getDailyMetrics(db)).length).toBe(data.daily.length);
  });
});

describe("status and tags", () => {
  it("stamps pausedAt, clears on live, reports unknown names", async () => {
    const n = live().name;
    expect(await setAdStatus(db, n, "paused", "2026-11-03")).toBe(true);
    expect((await listAds(db)).find((x) => x.name === n)).toMatchObject({ status: "paused", pausedAt: "2026-11-03" });
    await setAdStatus(db, n, "live", "2026-11-04");
    expect((await listAds(db)).find((x) => x.name === n)?.pausedAt).toBeUndefined();
    expect(await setAdStatus(db, "nope_1x1", "live", "2026-11-04")).toBe(false);
  });
  it("updates tags", async () => {
    const n = live().name;
    expect(await updateAdTags(db, n, { persona: ["IT"], funnel: "Intent", geo: ["US"] })).toBe(true);
    expect((await listAds(db)).find((x) => x.name === n)?.tags).toMatchObject({ persona: ["IT"], funnel: "Intent" });
  });
});

describe("metrics", () => {
  it("replaces sample rows on import, reports unmatched, and aggregates", async () => {
    const n = data.ads.find((a) => a.launchedAt && a.status === "retired")!.name;
    const before = (await getTotals(db))[n];
    expect(before.impressions).toBeGreaterThan(0);
    const res = await importMetricRows(db, [
      { adName: n, day: "2026-08-13", spend: 10, impressions: 1000, clicks: 10, conversions: 1 },
      { adName: n, day: "2026-08-14", spend: 20, impressions: 2000, clicks: 30, conversions: 2 },
      { adName: "Ghost_1x1", day: "2026-08-14", spend: 1, impressions: 1, clicks: 0, conversions: 0 },
    ]);
    expect(res).toEqual({ imported: 2, unmatchedNames: ["Ghost_1x1"] });
    expect((await getTotals(db))[n]).toEqual({ spend: 30, impressions: 3000, clicks: 40, conversions: 3 });
    await importMetricRows(db, [{ adName: n, day: "2026-08-14", spend: 5, impressions: 500, clicks: 5, conversions: 0 }]);
    expect((await getTotals(db))[n].impressions).toBe(1500); // same day upserted, not duplicated
  });
});

describe("checks", () => {
  it("upserts manual checks per period", async () => {
    const n = live().name;
    expect(await saveChecks(db, n, "2026-Q4", { campaignActive: true })).toBe(true);
    await saveChecks(db, n, "2026-Q4", { campaignActive: true, ctaMatch: true });
    expect((await getChecks(db, "2026-Q4"))[n]).toEqual({ campaignActive: true, ctaMatch: true });
    expect(await getChecks(db, "2026-Q3")).toEqual({});
    expect(await saveChecks(db, "nope_1x1", "2026-Q4", {})).toBe(false);
  });
  it("labels quarters", () => {
    expect([periodFor("2026-11-03"), periodFor("2026-01-01"), periodFor("2026-07-15")]).toEqual(["2026-Q4", "2026-Q1", "2026-Q3"]);
  });
});

describe("createBatch", () => {
  it("creates draft ads for a new concept, skips existing names", async () => {
    const tags = { persona: ["CX"], funnel: "Awareness" };
    const ads = [
      { conceptKey: "TestConcept", placement: "linkedin-single-image", platform: "linkedin", width: 1200, height: 1200, name: "TestConcept112026_1200x1200", tags },
      { conceptKey: "TestConcept", placement: "linkedin-single-image", platform: "linkedin", width: 1200, height: 628, name: "TestConcept112026_1200x628", tags },
    ];
    const input = { name: "Test batch", createdBy: "Tester", ads, concepts: [{ key: "TestConcept", tags }], placements: ["linkedin-single-image"] };
    const first = await createBatch(db, input);
    expect(first).toMatchObject({ created: 2, skipped: [] });
    const second = await createBatch(db, input);
    expect(second).toMatchObject({ created: 0, skipped: ["TestConcept112026_1200x1200", "TestConcept112026_1200x628"] });
    const created = (await listAds(db)).filter((a) => a.conceptKey === "TestConcept");
    expect(created).toHaveLength(2);
    expect(created.every((a) => a.status === "draft")).toBe(true);
    expect((await listBatches(db)).some((b) => b.name === "Test batch")).toBe(true);
  });
});

describe("settings and benchmarks", () => {
  it("falls back to defaults, then persists the gate and taxonomy", async () => {
    expect(await getGate(db)).toEqual({ minDays: 14, minImpressions: 10_000 });
    await saveGate(db, { minDays: 21, minImpressions: 25_000 });
    expect(await getGate(db)).toEqual({ minDays: 21, minImpressions: 25_000 });
    const tax = await getTaxonomy(db);
    expect(tax.funnels).toContain("Awareness");
    await saveTaxonomy(db, { ...tax, personas: ["CX", "Partner"] });
    expect((await getTaxonomy(db)).personas).toEqual(["CX", "Partner"]);
  });
  it("adds and deletes benchmarks", async () => {
    const before = (await listBenchmarkRows(db)).length;
    const id = await addBenchmark(db, { platform: "linkedin", funnel: "Awareness", metric: "cvr", value: 3, direction: "higher", tier: "secondary", source: "test", asOf: "2026-11-03" });
    expect((await listBenchmarkRows(db)).length).toBe(before + 1);
    expect(await deleteBenchmark(db, id)).toBe(true);
    expect(await deleteBenchmark(db, id)).toBe(false);
    expect((await listBenchmarkRows(db)).length).toBe(before);
  });
});

describe("Creative Score data model", () => {
  it("seeds ad type, stage and geo, and placeholder score benchmarks", async () => {
    const ads = await listAds(db);
    const a = ads.find((x) => x.name === live().name)!;
    expect(a.adType).toBe("Static");
    expect(["Awareness", "Interest", "Conversion"]).toContain(a.stage);
    expect(a.geo).toBe("US");
    const rows = await listScoreBenchmarks(db);
    expect(rows).toHaveLength(data.scoreBenchmarks.length);
    expect(rows.every((r) => r.status === "placeholder")).toBe(true);
  });

  it("upserts benchmarks per geo without touching the all-geos row, and deletes", async () => {
    const base = { platform: "linkedin", adType: "Static", stage: "Awareness" as const, kpis: { cpm: 20 }, status: "placeholder" as const };
    const before = await listScoreBenchmarks(db);
    const allGeos = before.find((r) => r.platform === "linkedin" && r.stage === "Awareness" && r.geo == null)!;
    const uk = await upsertScoreBenchmark(db, { ...base, geo: "UK" });
    const uk2 = await upsertScoreBenchmark(db, { ...base, geo: "UK", kpis: { cpm: 18 }, status: "verified" });
    expect(uk2).toBe(uk);
    const all2 = await upsertScoreBenchmark(db, { ...base, geo: null, kpis: allGeos.kpis });
    expect(all2).toBe(allGeos.id);
    const after = await listScoreBenchmarks(db);
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((r) => r.id === uk)).toMatchObject({ geo: "UK", kpis: { cpm: 18 }, status: "verified" });
    expect(await deleteScoreBenchmark(db, uk)).toBe(true);
    expect(await listScoreBenchmarks(db)).toHaveLength(before.length);
  });

  it("score config defaults, and saved edits persist", async () => {
    expect((await getScoreConfig(db)).minImpressions).toBe(10_000);
    const cfg = await getScoreConfig(db);
    await saveScoreConfig(db, { ...cfg, minImpressions: 5_000 });
    expect((await getScoreConfig(db)).minImpressions).toBe(5_000);
  });

  it("stores video metrics and keeps them null when a CSV has none", async () => {
    const [a, b] = data.ads.filter((x) => x.status === "live").slice(0, 2);
    await importMetricRows(db, [
      { adName: a.name, day: "2026-10-30", spend: 10, impressions: 1000, clicks: 5, conversions: 1, videoStarts: 400, videoCompletions: 100 },
      { adName: b.name, day: "2026-10-30", spend: 10, impressions: 1000, clicks: 5, conversions: 1 },
    ]);
    const raw = await getRawInputs(db);
    expect(raw[a.name].videoStarts).toBe(400);
    expect(raw[a.name].videoCompletions).toBe(100);
    expect(raw[b.name].videoStarts).toBeNull();
  });
});

describe("Templates (creative intent)", () => {
  it("seeds the intent templates and links every ad to one", async () => {
    const templates = await listTemplates(db);
    expect(templates.map((x) => x.slug)).toEqual(expect.arrayContaining(["lifestyle-impact", "product-feature-spotlight", "product-in-use"]));
    const seeded = new Map(data.ads.map((a) => [a.name, a.template]));
    const ads = (await listAds(db)).filter((a) => seeded.has(a.name));
    expect(ads).toHaveLength(data.ads.length);
    expect(ads.every((a) => a.templateName && a.templateSlug === seeded.get(a.name))).toBe(true);
  });

  it("ensureStarterTemplates is idempotent", async () => {
    expect(await ensureStarterTemplates(db)).toBe(0);
  });

  it("a batch ad can carry a template", async () => {
    const res = await createBatch(db, {
      name: "Template test", createdBy: "t", placements: ["facebook-feed"],
      concepts: [{ key: "TplTestConcept", tags: { persona: [] } }],
      ads: [{ conceptKey: "TplTestConcept", placement: "facebook-feed", platform: "meta", width: 1080, height: 1080, name: "TplTestConcept112026_1080x1080", tags: { persona: [] }, templateSlug: "product-in-use" }],
    });
    expect(res.created).toBe(1);
    const ad = (await listAds(db)).find((a) => a.name === "TplTestConcept112026_1080x1080")!;
    expect(ad.templateName).toBe("Product in use");
  });
});
