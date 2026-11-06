import { describe, expect, it } from "vitest";
import { FADE_MS, holdTimeMs, MIN_VISIBLE_MS, SHOW_DELAY_MS } from "./loading";

describe("loader timing", () => {
  it("never shows a loader for a load that finishes before it would appear", () => {
    expect(holdTimeMs(0)).toBeNull();
    expect(holdTimeMs(SHOW_DELAY_MS - 1)).toBeNull();
  });
  it("keeps a visible loader up for at least 1.5s in total", () => {
    expect(holdTimeMs(SHOW_DELAY_MS)).toBe(MIN_VISIBLE_MS);
    expect(holdTimeMs(300)).toBe(MIN_VISIBLE_MS - (300 - SHOW_DELAY_MS));
    for (const ms of [150, 200, 400, 700, 1000, 1649]) expect(ms - SHOW_DELAY_MS + holdTimeMs(ms)!).toBeGreaterThanOrEqual(MIN_VISIBLE_MS);
  });
  it("adds no extra wait once it has already played long enough, and the spec numbers hold", () => {
    expect(holdTimeMs(SHOW_DELAY_MS + MIN_VISIBLE_MS)).toBe(0);
    expect(holdTimeMs(5000)).toBe(0);
    expect(MIN_VISIBLE_MS).toBe(1500);
    expect(FADE_MS).toBe(200);
  });
});
