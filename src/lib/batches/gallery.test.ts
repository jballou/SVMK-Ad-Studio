import { describe, expect, it } from "vitest";
import { filterGallery, galleryItems, intentCounts } from "./gallery";
import { generateDummyData } from "@/lib/dummy/generate";

const items = galleryItems();

describe("concept gallery", () => {
  it("lists only non-draft concepts, each with an intent", () => {
    expect(items.length).toBeGreaterThan(10);
    expect(items.every((i) => i.intent && i.intentName && !i.concept.draft)).toBe(true);
  });

  it("uses the same intent the seeded ads carry", () => {
    const ads = generateDummyData().ads;
    for (const i of items) {
      const ad = ads.find((a) => a.conceptKey === i.concept.key);
      if (ad) expect(ad.template).toBe(i.intent);
    }
  });

  it("filters by intent, funnel and persona together", () => {
    const intent = items[0].intent;
    const r = filterGallery(items, { intent, funnel: items[0].concept.funnel, persona: items[0].concept.personas[0] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.intent === intent && x.concept.funnel === items[0].concept.funnel && x.concept.personas.includes(items[0].concept.personas[0]))).toBe(true);
  });

  it("search matches key, copy and intent name, all terms required, case-insensitive", () => {
    const first = items[0];
    expect(filterGallery(items, { query: first.concept.key.toUpperCase() }).map((x) => x.concept.key)).toContain(first.concept.key);
    expect(filterGallery(items, { query: first.intentName.toLowerCase() }).every((x) => x.intentName === first.intentName || x.concept.headline.toLowerCase().includes(first.intentName.toLowerCase()))).toBe(true);
    expect(filterGallery(items, { query: `${first.concept.key} zzzznotaword` })).toHaveLength(0);
  });

  it("counts per intent add up", () => {
    expect([...intentCounts(items).values()].reduce((a, b) => a + b, 0)).toBe(items.length);
  });
});
