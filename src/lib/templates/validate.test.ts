import { describe, expect, it } from "vitest";
import type { FigmaNode } from "@/lib/figma/client";
import { layoutFromSpec } from "@/lib/db/repo";
import { extractTemplateSpec } from "./extract";
import { validateSpecInput } from "./validate";

const frame: FigmaNode = {
  id: "1:1", type: "FRAME", name: "Test_1200x1200", absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 1200 }, fills: [{ type: "SOLID", color: { r: 0, g: 0.2, b: 0.1 } }],
  children: [
    { id: "1:2", type: "TEXT", name: "h", characters: "Hello there", absoluteBoundingBox: { x: 60, y: 800, width: 1000, height: 120 }, style: { fontSize: 80, fontFamily: "National 2", textAlignHorizontal: "LEFT" }, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] },
    { id: "1:3", type: "INSTANCE", name: "Logo", absoluteBoundingBox: { x: 300, y: 80, width: 600, height: 90 }, children: [{ id: "1:4", type: "VECTOR", name: "symbol", absoluteBoundingBox: { x: 300, y: 80, width: 600, height: 90 }, fills: [{ type: "SOLID", color: { r: 0.03, g: 0.6, b: 0.37 } }] }] },
  ],
};
const spec = () => extractTemplateSpec(frame, { fileKey: "abc" });

describe("validateSpecInput", () => {
  it("accepts what the extractor produces, including after a JSON round trip", () => {
    expect(validateSpecInput(JSON.parse(JSON.stringify(spec()))).ok).toBe(true);
  });
  it("rejects a tampered spec", () => {
    const bad = JSON.parse(JSON.stringify(spec()));
    bad.frames[0].elements[0].role = "admin";
    expect(validateSpecInput(bad).ok).toBe(false);
    expect(validateSpecInput({ version: 2 }).ok).toBe(false);
    expect(validateSpecInput(null).ok).toBe(false);
  });
  it("rejects an absurd character limit and an empty frame list", () => {
    const bad = JSON.parse(JSON.stringify(spec()));
    bad.frames[0].elements.find((e: { text?: unknown }) => e.text).text.maxChars = 99999;
    expect(validateSpecInput(bad).ok).toBe(false);
    expect(validateSpecInput({ ...spec(), frames: [] }).ok).toBe(false);
  });
});

describe("layoutFromSpec", () => {
  it("reads the headline's place and alignment", () => {
    expect(layoutFromSpec(spec()).layout).toBe("bottom"); // headline sits at 67% of the height
  });
});
