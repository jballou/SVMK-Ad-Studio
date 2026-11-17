import { describe, expect, it, vi } from "vitest";
import { noDataReason } from "./no-data";

vi.mock("@/components/scorecards/UploadPerformance", () => ({ UploadPerformance: () => null }));

describe("noDataReason", () => {
  it("is null when there are daily numbers", () => {
    expect(noDataReason({ ads: [{}], daily: [{}], dummy: false })).toBeNull();
  });
  it("says there are no ads, and that dummy data is off", () => {
    const r = noDataReason({ ads: [], daily: [], dummy: false })!;
    expect(r.title).toBe("No ads yet");
    expect(r.body).toMatch(/Dummy data is off/);
  });
  it("says ads exist but have no numbers", () => {
    const r = noDataReason({ ads: [{}, {}], daily: [], dummy: true })!;
    expect(r.title).toBe("No performance numbers yet");
    expect(r.body).toMatch(/2 ads/);
    expect(r.body).not.toMatch(/Dummy data is off/);
  });
});
