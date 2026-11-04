import { describe, expect, it } from "vitest";
import { checkCopy, planBatch } from "./plan";
import { COPY_DECKS, DECK_LIMITS, TEMPLATE_FILES } from "@/lib/dummy/library";

describe("planBatch", () => {
  it("expands concept x placement x size and de-duplicates shared sizes", () => {
    const plan = planBatch({ conceptKeys: ["YourBrand"], placementKeys: ["linkedin-single-image", "facebook-feed", "facebook-link-landscape"], month: 11, year: 2026, existing: new Set() });
    // 3 LinkedIn + 2 Facebook feed sizes; the link placement's 1200x628 reuses the LinkedIn file of that size
    expect(plan.map((p) => p.name)).toEqual(["YourBrand112026_1200x1200", "YourBrand112026_1200x628", "YourBrand112026_720x900", "YourBrand112026_1080x1080", "YourBrand112026_1080x1350"]);
  });
  it("flags names that already exist", () => {
    const plan = planBatch({ conceptKeys: ["YourBrand"], placementKeys: ["linkedin-single-image"], month: 11, year: 2026, existing: new Set(["YourBrand112026_1200x628"]) });
    expect(plan.filter((p) => p.exists).map((p) => p.name)).toEqual(["YourBrand112026_1200x628"]);
  });
  it("ignores unknown placements", () => {
    expect(planBatch({ conceptKeys: ["A"], placementKeys: ["nope"], month: 1, year: 2026, existing: new Set() })).toEqual([]);
  });
});

describe("checkCopy", () => {
  const ok = { headline: "h", platformHeadline: "Short", intro: "Short intro", cta: "Go" };
  it("passes clean copy and flags limits", () => {
    expect(checkCopy(ok, DECK_LIMITS)).toEqual([]);
    expect(checkCopy({ ...ok, intro: "x".repeat(151) }, DECK_LIMITS)[0]).toMatchObject({ severity: "error", field: "intro" });
    expect(checkCopy({ ...ok, intro: "x".repeat(146) }, DECK_LIMITS)[0]).toMatchObject({ severity: "warn" });
    expect(checkCopy({ ...ok, platformHeadline: "" }, DECK_LIMITS)[0].message).toMatch(/Missing/);
  });
});

describe("library dummy data", () => {
  it("has a template and deck per campaign, and the Phase 2 deck has flawed rows", () => {
    expect(TEMPLATE_FILES.length).toBeGreaterThanOrEqual(5);
    expect(COPY_DECKS.length).toBe(TEMPLATE_FILES.length);
    const p2 = COPY_DECKS.find((d) => d.name.startsWith("SA Campaign"))!;
    const flagged = p2.rows.filter((r) => checkCopy(r, DECK_LIMITS).some((c) => c.severity === "error"));
    expect(flagged.length).toBeGreaterThanOrEqual(2);
  });
});
