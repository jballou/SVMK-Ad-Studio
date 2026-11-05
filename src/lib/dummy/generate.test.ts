import { describe, expect, it } from "vitest";
import { parseAdName } from "@/lib/figma/parse-frame-name";
import { DUMMY_TODAY, generateDummyData } from "./generate";

const data = generateDummyData();

describe("generateDummyData", () => {
  it("is deterministic", () => {
    const again = generateDummyData();
    expect(again.ads.map((a) => a.name)).toEqual(data.ads.map((a) => a.name));
    expect(again.daily.length).toBe(data.daily.length);
    expect(again.daily[100]).toEqual(data.daily[100]);
  });
  it("produces ~175-210 ads with unique, parseable names", () => {
    expect(data.ads.length).toBeGreaterThan(150);
    expect(data.ads.length).toBeLessThan(215);
    expect(new Set(data.ads.map((a) => a.name)).size).toBe(data.ads.length);
    for (const a of data.ads.filter((x) => x.launchedAt)) {
      expect(parseAdName(a.name)).toMatchObject({ conceptKey: a.conceptKey, width: a.width, height: a.height });
    }
  });
  it("spans six months with a realistic status mix", () => {
    const launches = data.ads.flatMap((a) => (a.launchedAt ? [a.launchedAt] : [])).sort();
    expect(launches[0] >= "2026-05-01" && launches[launches.length - 1] <= DUMMY_TODAY).toBe(true);
    const count = (s: string) => data.ads.filter((a) => a.status === s).length;
    expect(count("live")).toBeGreaterThan(30);
    expect(count("paused")).toBeGreaterThan(10);
    expect(count("retired")).toBeGreaterThan(10);
    expect(count("draft")).toBeGreaterThan(0);
  });
  it("only has metrics inside each ad's live window", () => {
    const byName = new Map(data.ads.map((a) => [a.name, a]));
    for (const d of data.daily) {
      const a = byName.get(d.adName)!;
      expect(d.day >= a.launchedAt!).toBe(true);
      expect(d.day <= (a.pausedAt ?? DUMMY_TODAY)).toBe(true);
      expect(d.clicks).toBeLessThanOrEqual(d.impressions);
    }
    expect(data.daily.length).toBeGreaterThan(4000);
  });
  it("builds experiments from real ads", () => {
    const names = new Set(data.ads.map((a) => a.name));
    expect(data.experiments.length).toBeGreaterThanOrEqual(6);
    for (const e of data.experiments) {
      expect(names.has(e.adA) && names.has(e.adB) && e.adA !== e.adB).toBe(true);
    }
  });
  it("covers every platform/funnel with a primary benchmark", () => {
    for (const p of ["linkedin", "meta", "display", "newsletter"]) {
      for (const f of ["Awareness", "Consideration", "Intent"]) {
        expect(data.benchmarks.some((b) => b.platform === p && b.funnel === f && b.tier === "primary")).toBe(true);
      }
    }
  });
});
