import { describe, expect, it } from "vitest";
import type { AdRecord } from "@/lib/ads/types";
import { compareCtr, normalCdf } from "./ab";
import { dailySeries, pctChange, performanceIndex, rates, totalsByDimension, weeklySeries, type DailyPoint } from "./aggregate";
import { assessFatigue, fatigueReport, rollingCtr } from "./fatigue";

const ad = (name: string, over: Partial<AdRecord> = {}): AdRecord => ({
  id: name, name, conceptKey: "C", platform: "linkedin", placement: "p", width: 1, height: 1, status: "live", launchedAt: "2026-09-01", tags: { persona: ["CX"], funnel: "Awareness" }, ...over,
});
const pt = (adName: string, day: string, impressions: number, clicks: number): DailyPoint => ({ adName, day, spend: impressions / 100, impressions, clicks, conversions: 0 });
const days = (n: number, start = "2026-10-01") => Array.from({ length: n }, (_, i) => new Date(Date.parse(start) + i * 86_400_000).toISOString().slice(0, 10));

describe("aggregation", () => {
  it("groups totals by dimension, including multi-valued tags", () => {
    const a = ad("a", { tags: { persona: ["CX", "IT"], funnel: "Awareness" } });
    const m = totalsByDimension([pt("a", "2026-10-01", 1000, 10)], new Map([["a", a]]), (x) => x.tags.persona);
    expect([...m.keys()].sort()).toEqual(["CX", "IT"]);
    expect(m.get("IT")?.clicks).toBe(10);
  });
  it("builds daily and weekly series", () => {
    const pts = [pt("a", "2026-10-05", 1000, 10), pt("a", "2026-10-06", 1000, 20), pt("a", "2026-10-12", 1000, 30)];
    expect(dailySeries(pts, (t) => t.clicks)).toHaveLength(3);
    expect(weeklySeries(pts, (t) => t.clicks)).toEqual([{ x: "2026-10-05", y: 30 }, { x: "2026-10-12", y: 30 }]);
  });
  it("computes rates and percent change safely", () => {
    expect(rates({ spend: 100, impressions: 10000, clicks: 100, conversions: 10 })).toMatchObject({ ctr: 1, cpc: 1, cpm: 10, cvr: 10, cpa: 10 });
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(1, 0)).toBeUndefined();
  });
  it("indexes performance against the primary benchmark", () => {
    const b = [{ platform: "linkedin", funnel: "Awareness", metric: "ctr" as const, value: 0.5, direction: "higher" as const, tier: "primary" as const }];
    expect(performanceIndex(ad("a"), { spend: 1, impressions: 10000, clicks: 100, conversions: 0 }, b)).toBeCloseTo(2);
    expect(performanceIndex(ad("a", { platform: "meta" }), { spend: 1, impressions: 10000, clicks: 100, conversions: 0 }, b)).toBeUndefined();
  });
});

describe("fatigue", () => {
  const decaying = days(28).map((d, i) => pt("a", d, 10000, Math.round(100 - i * 2.2)));
  it("flags a steadily decaying ad", () => {
    const r = assessFatigue(ad("a"), decaying, "2026-10-29")!;
    expect(r.level).toBe("fatigued");
    expect(r.declinePct).toBeGreaterThan(35);
    expect(rollingCtr(decaying)[0].y).toBeGreaterThan(r.currentCtr);
  });
  it("leaves a stable ad healthy and ignores short histories", () => {
    const flat = days(28).map((d) => pt("b", d, 10000, 100));
    expect(assessFatigue(ad("b"), flat, "2026-10-29")?.level).toBe("healthy");
    expect(assessFatigue(ad("c"), flat.slice(0, 10), "2026-10-29")).toBeUndefined();
  });
  it("reports only live, non-healthy ads worst first", () => {
    const map = new Map([["a", decaying], ["b", days(28).map((d) => pt("b", d, 10000, 100))]]);
    const rep = fatigueReport([ad("a"), ad("b"), ad("a2", { status: "paused" })], map, "2026-10-29");
    expect(rep.map((r) => r.ad.name)).toEqual(["a"]);
  });
});

describe("A/B", () => {
  it("normal CDF sanity", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });
  it("declares a winner on a clear difference with volume", () => {
    const r = compareCtr({ spend: 0, impressions: 100000, clicks: 500, conversions: 0 }, { spend: 0, impressions: 100000, clicks: 650, conversions: 0 });
    expect(r).toMatchObject({ winner: "B", significant: true, underpowered: false });
    expect(r.lift).toBeCloseTo(30);
  });
  it("refuses to call small or close tests", () => {
    expect(compareCtr({ spend: 0, impressions: 1000, clicks: 5, conversions: 0 }, { spend: 0, impressions: 1000, clicks: 20, conversions: 0 }).underpowered).toBe(true);
    expect(compareCtr({ spend: 0, impressions: 100000, clicks: 500, conversions: 0 }, { spend: 0, impressions: 100000, clicks: 510, conversions: 0 }).winner).toBe("none");
  });
});
