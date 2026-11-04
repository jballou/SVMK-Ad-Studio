import { describe, expect, it } from "vitest";
import type { AdRecord } from "@/lib/ads/types";
import { buildScorecard, daysLive, evaluateTier, type Benchmark } from "./build";

const ad = (over: Partial<AdRecord> = {}): AdRecord => ({
  id: "a", name: "A072025_1200x1200", conceptKey: "A", platform: "linkedin", placement: "p", width: 1200, height: 1200,
  status: "live", launchedAt: "2026-08-01", tags: { persona: [], funnel: "Awareness" }, ...over,
});
const bm: Benchmark[] = [
  { platform: "linkedin", funnel: "Awareness", metric: "ctr", value: 0.5, direction: "higher", tier: "primary" },
  { platform: "linkedin", funnel: "Awareness", metric: "cpc", value: 10, direction: "lower", tier: "secondary" },
];
const good = { spend: 400, impressions: 100_000, clicks: 600, conversions: 5 }; // ctr .6, cpc .67
const bad = { spend: 5000, impressions: 100_000, clicks: 200, conversions: 1 }; // ctr .2, cpc 25
const manual = { campaignActive: true, landingPageClear: true, ctaMatch: true, icpMatch: true };

describe("evaluateTier", () => {
  it("is direction-aware and null without benchmarks", () => {
    expect(evaluateTier(good, ad(), bm, "primary")).toBe(true);
    expect(evaluateTier(bad, ad(), bm, "secondary")).toBe(false);
    expect(evaluateTier(good, ad({ platform: "meta" }), bm, "primary")).toBeNull();
  });
});

describe("daysLive", () => {
  it("stops counting at the pause date", () => {
    expect(daysLive(ad({ status: "paused", pausedAt: "2026-08-11" }), "2026-11-04")).toBe(10);
    expect(daysLive(ad(), "2026-08-11")).toBe(10);
  });
});

describe("buildScorecard", () => {
  const base = { benchmarks: bm, manual, peers: [], today: "2026-11-04" };
  it("withholds the score while in the learning phase", () => {
    const r = buildScorecard({ ...base, ad: ad({ launchedAt: "2026-10-30" }), totals: good });
    expect(r).toMatchObject({ state: "too-early", daysLive: 5 });
  });
  it("scores a mature ad; top performer is null with no peers", () => {
    const r = buildScorecard({ ...base, ad: ad(), totals: good });
    expect(r.state).toBe("scored");
    if (r.state === "scored") {
      expect(r.criteria.topPerformer).toBeNull();
      expect(r.criteria.underNinetyDays).toBe(false); // 95 days
      expect(r.score).toMatchObject({ earned: 35, possible: 40 });
    }
  });
  it("ranks against eligible peers", () => {
    const peer = { ad: ad({ id: "b", name: "B" }), totals: bad };
    const r = buildScorecard({ ...base, ad: ad(), totals: good, peers: [peer] });
    expect(r.state === "scored" && r.criteria.topPerformer).toBe(true);
  });
});
