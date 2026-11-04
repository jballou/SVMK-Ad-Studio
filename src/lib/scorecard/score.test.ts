import { describe, expect, it } from "vitest";
import { Criterion, CriterionResult, bandFor, isTooEarly, scoreCard } from "./score";

const all = (v: CriterionResult): Record<Criterion, CriterionResult> => ({
  campaignActive: v, landingPageClear: v, ctaMatch: v, icpMatch: v,
  underNinetyDays: v, primaryMetrics: v, secondaryMetrics: v, topPerformer: v,
});

describe("scoreCard", () => {
  it("matches the deck: 30/45 = 67% (CTV HumansMatter)", () => {
    const s = scoreCard({ ...all(true), primaryMetrics: false, secondaryMetrics: false });
    expect(s).toMatchObject({ earned: 30, possible: 45, percent: 67, band: "optimize-test" });
  });
  it("drops null criteria from the denominator (25/25 = 100%)", () => {
    const s = scoreCard({ ...all(true), primaryMetrics: null, secondaryMetrics: null, topPerformer: null });
    expect(s).toMatchObject({ earned: 25, possible: 25, percent: 100, band: "keep-scale" });
  });
});

describe("bands", () => {
  it("uses the deck thresholds", () => {
    expect([90, 89, 70, 69, 50, 49].map(bandFor)).toEqual([
      "keep-scale", "monitor-optimize", "monitor-optimize", "optimize-test", "optimize-test", "refresh-pause",
    ]);
  });
});

describe("isTooEarly", () => {
  it("requires both days and volume", () => {
    expect(isTooEarly(10, 50_000)).toBe(true);
    expect(isTooEarly(30, 500)).toBe(true);
    expect(isTooEarly(30, 50_000)).toBe(false);
  });
});
