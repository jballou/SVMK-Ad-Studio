import { describe, expect, it } from "vitest";
import { actionFor, scoreCreative, sumInputs, tierFor, type Benchmark } from "./creative-score";

// Benchmarks back-solved from the sheet's own indices (the sheet only showed some benchmark rows).
const benchmarks: Benchmark[] = [
  { platform: "Meta", adType: "Static", stage: "Awareness", geo: null, status: "placeholder", kpis: { cpm: 3.19, ctr: 0.00229, convRate: 0.01 } },
  { platform: "LinkedIn", adType: "Carousel", stage: "Awareness", geo: null, status: "verified", kpis: { cpm: 32.2, ctr: 0.001689, convRate: 0.1293 } },
  { platform: "LinkedIn", adType: "CTV", stage: "Awareness", geo: null, status: "verified", kpis: { cpm: 26.1 } },
  { platform: "LinkedIn", adType: "CTV", stage: "Awareness", geo: "UK", status: "placeholder", kpis: { cpm: 20 } },
];

const row = (platform: string, adType: string, impressions: number, spend: number, clicks: number, conversions: number, starts: number | null = null, completions: number | null = null) =>
  ({ platform, adType, stage: "Awareness" as const, raw: { impressions, spend, clicks, conversions, videoStarts: starts, videoCompletions: completions } });

describe("scoreCreative against the sheet's rows", () => {
  it("Meta static: counts a 0% conversion rate as index 0 and ignores VTR (static family) -> 81 Iterate", () => {
    const r = scoreCreative(row("Meta", "Static", 22_336_341, 68_549, 49_611, 0, 1_488_423, 103_823), benchmarks);
    expect(r.status).toBe("scored");
    if (r.status !== "scored") return;
    expect(r.score).toBe(81);
    expect(r.tier).toBe("Iterate");
    expect(Math.round(r.indices.cpm!)).toBe(104);
    expect(Math.round(r.indices.ctr!)).toBe(97);
    expect(r.indices.convRate).toBe(0);
    expect(r.indices.vtr).toBeUndefined();
  });

  it("LinkedIn carousel -> 100 On benchmark", () => {
    const r = scoreCreative(row("LinkedIn", "Carousel", 1_529_035, 49_228, 2_711, 326), benchmarks);
    expect(r.status === "scored" && r.score).toBe(100);
    expect(r.status === "scored" && r.tier).toBe("On benchmark");
  });

  it("CTV: only CPM has a benchmark, so the score is the CPM index (137 Scale; the 62,800% conv rate is never scored)", () => {
    const r = scoreCreative(row("LinkedIn", "CTV", 3_330_011, 63_390, 1, 628, 0, 3_317_150), benchmarks);
    expect(r.status).toBe("scored");
    if (r.status !== "scored") return;
    expect(r.score).toBe(137);
    expect(r.tier).toBe("Scale");
    expect(r.dropped).toEqual(expect.arrayContaining(["vtr", "completion", "ctr", "convRate"]));
  });

  it("CTV expensive CPM -> 52 Pause", () => {
    const r = scoreCreative(row("LinkedIn", "CTV", 981_959, 49_060, 0, 185, 0, 981_156), benchmarks);
    expect(r.status === "scored" && r.score).toBe(52);
    expect(r.status === "scored" && r.tier).toBe("Pause");
  });
});

describe("eligibility, geo and edge cases", () => {
  it("under 10,000 impressions is 'insufficient', not a score", () => {
    expect(scoreCreative(row("Meta", "Static", 9_999, 100, 10, 1), benchmarks).status).toBe("insufficient");
  });

  it("uses the geo's own benchmark first, then falls back to all-geos", () => {
    const base = row("LinkedIn", "CTV", 1_000_000, 20_000, 0, 0);
    const uk = scoreCreative({ ...base, geo: "UK" }, benchmarks);
    const de = scoreCreative({ ...base, geo: "DE" }, benchmarks);
    expect(uk.status === "scored" && uk.geoMatch).toBe("exact");
    expect(uk.status === "scored" && uk.score).toBe(100); // 20 / 20
    expect(de.status === "scored" && de.geoMatch).toBe("all-geos");
    expect(de.status === "scored" && de.score).toBe(131); // 26.1 / 20 = 130.5
  });

  it("no benchmark and unknown ad types are reported, not guessed", () => {
    expect(scoreCreative(row("Meta", "Carousel", 50_000, 100, 10, 1), benchmarks).status).toBe("no-benchmark");
    expect(scoreCreative(row("Meta", "Hologram", 50_000, 100, 10, 1), benchmarks).status).toBe("unknown-ad-type");
  });

  it("caps each index at 200", () => {
    const r = scoreCreative(row("LinkedIn", "CTV", 1_000_000, 100, 0, 0), benchmarks);
    expect(r.status === "scored" && r.score).toBe(200);
  });

  it("sums ad sets before deriving rates", () => {
    const t = sumInputs([
      { impressions: 1_000_000, spend: 10_000, clicks: 1_000, conversions: 10 },
      { impressions: 10_000, spend: 1_000, clicks: 100, conversions: 50 },
    ]);
    expect(t.clicks).toBe(1_100);
    expect(t.videoStarts).toBeNull();
  });
});

describe("tiers and actions", () => {
  it.each([[120, "Scale"], [119, "Outperforming"], [105, "Outperforming"], [104, "On benchmark"], [90, "On benchmark"], [89, "Iterate"], [75, "Iterate"], [74, "Pause"]] as const)("%i -> %s", (s, t) => {
    expect(tierFor(s)).toBe(t);
  });

  it("Scale means different things on social vs display", () => {
    expect(actionFor("Scale", "LinkedIn")).toMatch(/Duplicate/);
    expect(actionFor("Scale", "Display")).toMatch(/budget share/);
  });
});
