import { describe, expect, it } from "vitest";
import type { FigmaNode } from "./client";
import { discoverFrames, groupByConcept } from "./discover";
import { parseFigmaUrl } from "./client";

const n = (id: string, name: string, type = "FRAME", children?: FigmaNode[]): FigmaNode => ({
  id, name, type, absoluteBoundingBox: { x: 0, y: 0, width: 1, height: 1 }, children,
});

const tree = n("0:1", "Page", "CANVAS", [
  n("1:1", "Concept", "SECTION", [
    n("1:2", "AD | YourBrand | 1200x1200", "FRAME", [
      n("2:1", "#headline[40]", "TEXT"),
      n("2:2", "Group", "GROUP", [n("2:3", "#hero", "RECTANGLE"), n("2:4", "Frame 99", "FRAME")]),
    ]),
    n("1:3", "AD | YourBrand | 720x900", "FRAME"),
    n("1:4", "LI Marketing Consideration Ad #1_1200x628", "FRAME"),
    n("1:5", "MOCKUP", "FRAME", [n("3:1", "AD | Nested | 100x100", "FRAME")]),
  ]),
]);

describe("discoverFrames", () => {
  it("finds scheme frames and their slots", () => {
    const r = discoverFrames(tree);
    expect(r.frames.map((f) => f.nodeId)).toEqual(["1:2", "1:3", "3:1"]);
    expect(r.frames[0].slots.map((s) => [s.slot, s.maxChars])).toEqual([["headline", 40], ["hero", undefined]]);
    expect(r.unmatched.map((u) => u.nodeId)).toEqual(["1:4"]);
  });
  it("falls back to legacy names when asked", () => {
    const r = discoverFrames(tree, { allowLegacy: true });
    const legacy = r.frames.find((f) => f.nodeId === "1:4");
    expect(legacy).toMatchObject({ conceptKey: "LIMarketingConsiderationAd1", width: 1200, height: 628, legacy: true });
  });
  it("skips hidden nodes", () => {
    const hidden = n("0:2", "P", "CANVAS", [{ ...n("9:1", "AD | X | 10x10"), visible: false }]);
    expect(discoverFrames(hidden).frames).toHaveLength(0);
  });
});

describe("groupByConcept", () => {
  it("groups sizes under one concept", () => {
    const g = groupByConcept(discoverFrames(tree).frames);
    expect(g.find((c) => c.conceptKey === "YourBrand")?.sizes).toHaveLength(2);
  });
});

describe("parseFigmaUrl", () => {
  it("extracts key and node id", () => {
    expect(parseFigmaUrl("https://www.figma.com/design/G2S2291KKTHEGJGt4TNVg3/Name?node-id=1488-75739&t=x")).toEqual({
      fileKey: "G2S2291KKTHEGJGt4TNVg3", nodeId: "1488:75739",
    });
  });
});
