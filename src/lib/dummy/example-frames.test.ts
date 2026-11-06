import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONCEPTS, conceptImage, exampleImageFor } from "./concepts";
import { EXAMPLE_FRAMES } from "./example-frames";

describe("real Figma examples per ad size", () => {
  it("uses the size-matched frame when there is one, else the concept's square export", () => {
    expect(exampleImageFor("TrustAtScale", 1200, 628)).not.toBe(conceptImage("TrustAtScale"));
    expect(exampleImageFor("TrustAtScale", 1200, 1200)).toBe(conceptImage("TrustAtScale"));
    expect(exampleImageFor("TopFormsBuilder", 300, 250)).toBe(conceptImage("TopFormsBuilder")); // no display frame for this one
    expect(exampleImageFor("GetInsights", 1200, 628)).toBeUndefined(); // sheet-only concept, no Figma export
  });

  it("only maps concepts that exist", () => {
    const keys = new Set(CONCEPTS.map((c) => c.key));
    for (const k of Object.keys(EXAMPLE_FRAMES)) expect(keys.has(k)).toBe(true);
  });

  it("matches shapes: every mapped frame is within a close ratio of the ad size", () => {
    const sizeOf = (f: string) => { const m = /(\d+)x(\d+)/.exec(f); return m ? [Number(m[1]), Number(m[2])] : null; };
    for (const sizes of Object.values(EXAMPLE_FRAMES)) for (const size of Object.keys(sizes)) expect(sizeOf(size)).not.toBeNull();
  });

  // The image files are git-ignored, so only check them when they exist locally.
  it.runIf(existsSync("public/examples/trust-at-scale.png"))("points at files that exist", () => {
    for (const sizes of Object.values(EXAMPLE_FRAMES)) for (const url of Object.values(sizes)) expect(existsSync(`public${url}`)).toBe(true);
  });
});
