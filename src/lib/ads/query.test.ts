import { describe, expect, it } from "vitest";
import { distinct, filterAds, setStatus, sortAds } from "./query";
import { SEED_ADS } from "./seed";

describe("filterAds", () => {
  it("combines filters", () => {
    const r = filterAds(SEED_ADS, { platform: "meta", status: "live" });
    expect(r.map((a) => a.name)).toEqual(["JustBeginning082026_1080x1080", "JustBeginning082026_1080x1920"]);
  });
  it("matches tags and text", () => {
    expect(filterAds(SEED_ADS, { persona: "IT" })).toHaveLength(3);
    expect(filterAds(SEED_ADS, { q: "humans" })).toHaveLength(3);
  });
});

describe("sortAds", () => {
  it("sorts by launch date, newest first, unlaunched last", () => {
    const r = sortAds(SEED_ADS, "launched");
    expect(r[0].launchedAt).toBe("2026-08-19");
    expect(r[r.length - 1].launchedAt).toBeUndefined();
  });
});

describe("setStatus", () => {
  it("stamps pause date and clears it on resume", () => {
    const paused = setStatus(SEED_ADS[0], "paused", "2026-11-03");
    expect(paused).toMatchObject({ status: "paused", pausedAt: "2026-11-03" });
    expect(setStatus(paused, "live", "2026-11-10").pausedAt).toBeUndefined();
  });
  it("does not mutate", () => {
    setStatus(SEED_ADS[0], "paused", "2026-11-03");
    expect(SEED_ADS[0].status).toBe("live");
  });
});

describe("distinct", () => {
  it("lists persona tags", () => {
    expect(distinct(SEED_ADS, (a) => a.tags.persona)).toEqual(["CX", "Enterprise", "IT", "Marketing"]);
  });
});
