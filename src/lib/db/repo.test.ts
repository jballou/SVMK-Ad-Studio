import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import { SEED_ADS } from "@/lib/ads/seed";
import { getBenchmarks, getChecks, getTotals, importMetricRows, listAds, periodFor, saveChecks, setAdStatus } from "./repo";

vi.mock("server-only", () => ({}));

let db: Db;
beforeAll(async () => {
  const d = drizzle(new PGlite(), { schema });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  await seedIfEmpty(db);
  await seedIfEmpty(db); // idempotent
}, 30_000);

describe("seed + listAds", () => {
  it("round-trips the sample ads once", async () => {
    const ads = await listAds(db);
    expect(ads).toHaveLength(SEED_ADS.length);
    const a = ads.find((x) => x.name === "HumansMatter082026_1200x1200")!;
    expect(a).toMatchObject({ platform: "linkedin", width: 1200, height: 1200, status: "live", conceptKey: "HumansMatter" });
    expect(a.tags.persona).toEqual(["CX"]);
  });
});

describe("status", () => {
  it("stamps pausedAt, clears on live, reports unknown names", async () => {
    const n = "NotSurveys082026_1200x1200";
    expect(await setAdStatus(db, n, "paused", "2026-11-03")).toBe(true);
    expect((await listAds(db)).find((x) => x.name === n)).toMatchObject({ status: "paused", pausedAt: "2026-11-03" });
    await setAdStatus(db, n, "live", "2026-11-04");
    expect((await listAds(db)).find((x) => x.name === n)?.pausedAt).toBeUndefined();
    expect(await setAdStatus(db, "nope_1x1", "live", "2026-11-04")).toBe(false);
  });
});

describe("metrics", () => {
  it("replaces sample rows on import, reports unmatched, and aggregates", async () => {
    const n = "HumansMatter082026_1200x628";
    const before = (await getTotals(db))[n];
    expect(before.impressions).toBe(380_000);
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

describe("benchmarks and checks", () => {
  it("loads benchmarks and upserts manual checks per period", async () => {
    expect((await getBenchmarks(db)).length).toBeGreaterThan(0);
    const n = "NotSurveys082026_300x250";
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
