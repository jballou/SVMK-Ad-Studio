import { describe, expect, it } from "vitest";
import type { FigmaNode } from "@/lib/figma/client";
import { extractFrameSpec, extractTemplateSpec, hex, logoVariantOf } from "./extract";

type Rect = [number, number, number, number];
const solid = (r: number, g: number, b: number) => [{ type: "SOLID", color: { r, g, b } }];
const IMG = [{ type: "IMAGE", scaleMode: "FILL", imageRef: "x" }];
let id = 0;
const node = (type: string, name: string, [x, y, w, h]: Rect, extra: Partial<FigmaNode> = {}): FigmaNode => ({ id: `n${++id}`, type, name, absoluteBoundingBox: { x, y, width: w, height: h }, ...extra });
const text = (name: string, chars: string, r: Rect, size: number, extra: Partial<FigmaNode> = {}) =>
  node("TEXT", name, r, { characters: chars, fills: solid(1, 1, 1), style: { fontFamily: "National 2", fontSize: size, fontWeight: 700, textAlignHorizontal: "CENTER", textAutoResize: "HEIGHT", lineHeightPx: size * 1.2 }, ...extra });
const logo = (r: Rect, color = [0.03, 0.6, 0.37]) => node("INSTANCE", "Logo", r, { children: [node("VECTOR", "symbol", [r[0], r[1], r[2], r[3]], { fills: solid(color[0], color[1], color[2]) })] });
const frame = (name: string, w: number, h: number, children: FigmaNode[], extra: Partial<FigmaNode> = {}) => node("FRAME", name, [0, 0, w, h], { fills: solid(0.06, 0.18, 0.13), clipsContent: true, children, ...extra });

describe("extractFrameSpec", () => {
  const f = () => frame("Test_1200x1200", 1200, 1200, [
    logo([300, 80, 600, 90]),
    text("Heading", "Industry-leading security", [60, 300, 1080, 160], 90),
    text("Sub", "Trusted by 260K organizations", [60, 500, 1080, 60], 50, { style: { fontSize: 50, fontWeight: 500, textAlignHorizontal: "CENTER", textAutoResize: "HEIGHT" } }),
    node("FRAME", "Button", [450, 900, 300, 90], { fills: solid(0.03, 0.6, 0.37), cornerRadius: 12, children: [text("t", "Get started", [480, 920, 240, 50], 32)] }),
  ]);

  it("infers headline, subhead, logo and CTA from structure", () => {
    const s = extractFrameSpec(f(), { conceptKey: "Test", width: 1200, height: 1200 });
    const role = (r: string) => s.elements.find((e) => e.role === r);
    expect(role("headline")?.text?.chars).toBe(25);
    expect(role("subhead")?.text?.font.size).toBe(50);
    expect(role("logo")?.logo?.variant).toBe("green");
    expect(role("cta")?.cta).toMatchObject({ label: "Get started", radius: 12 });
    expect(role("cta")?.box.y).toBeCloseTo(0.75, 2);
    expect(s.background.color).toBe("#0F2E21");
    expect(s.elements.every((e) => e.source === "inferred")).toBe(true);
  });
  it("keeps paint order as z", () => {
    const s = extractFrameSpec(f(), { width: 1200, height: 1200 });
    expect(s.elements.map((e) => e.z)).toEqual([0, 1, 2, 3]);
    expect(s.elements[0].role).toBe("logo");
  });
  it("suggests character limits from the copy and the box", () => {
    const h = extractFrameSpec(f(), { width: 1200, height: 1200 }).elements.find((e) => e.role === "headline")!.text!;
    expect(h.maxChars).toBeGreaterThanOrEqual(h.chars);
    expect(h.maxChars).toBeLessThanOrEqual(Math.max(h.capacity, h.chars));
  });
  it("trusts #slot names, including a character limit", () => {
    const fr = frame("T_1200x1200", 1200, 1200, [logo([300, 80, 600, 90]), text("#headline[30]", "Short", [60, 300, 1080, 160], 90), text("Other", "Bigger?", [60, 600, 1080, 300], 200)]);
    const s = extractFrameSpec(fr, { width: 1200, height: 1200 });
    const h = s.elements.find((e) => e.name === "#headline[30]")!;
    expect(h).toMatchObject({ role: "headline", source: "named" });
    expect(h.text!.maxChars).toBe(30);
    expect(s.elements.find((e) => e.name === "Other")!.role).not.toBe("headline");
  });
  it("measures margins and the gap between text", () => {
    const s = extractFrameSpec(f(), { width: 1200, height: 1200 });
    expect(s.layout.margins.top).toBeCloseTo(80 / 1200, 2);
    expect(s.layout.textGaps[0]).toBe(40); // 300+160 -> 500
  });
  it("reads a full-bleed image as the background and a smaller one as an image", () => {
    const fr = frame("T_1200x1200", 1200, 1200, [node("RECTANGLE", "photo", [0, 0, 1200, 1200], { fills: IMG }), node("RECTANGLE", "product", [600, 600, 400, 400], { fills: IMG }), logo([300, 80, 600, 90]), text("h", "Hello there", [60, 300, 1080, 100], 80)]);
    const s = extractFrameSpec(fr, { width: 1200, height: 1200 });
    expect(s.background.image).toBe(true);
    expect(s.elements.find((e) => e.role === "background-image")?.image?.coversFrame).toBe(true);
    expect(s.elements.find((e) => e.role === "image")?.image).toMatchObject({ fit: "fill", coversFrame: false });
  });
  it("collapses a grid of partner logos into one element", () => {
    const tile = (i: number) => node("FRAME", `tile ${i}`, [(i % 3) * 400, 700 + Math.floor(i / 3) * 250, 380, 240], { children: [node("FRAME", "Acme logo", [(i % 3) * 400, 700 + Math.floor(i / 3) * 250, 380, 240], { fills: IMG })] });
    const fr = frame("T_1200x1200", 1200, 1200, [logo([300, 80, 600, 90]), text("h", "Hello there", [60, 300, 1080, 100], 80), node("FRAME", "grid", [0, 700, 1200, 500], { children: [0, 1, 2, 3, 4, 5].map(tile) })]);
    const grid = extractFrameSpec(fr, { width: 1200, height: 1200 }).elements.find((e) => e.role === "partner-logos");
    expect(grid?.count).toBe(6);
    expect(extractFrameSpec(fr, { width: 1200, height: 1200 }).elements.filter((e) => e.role === "partner-logos")).toHaveLength(1);
  });
  it("treats a one-glyph text as an icon, not copy", () => {
    const fr = frame("T_1200x1200", 1200, 1200, [logo([300, 80, 600, 90]), text("h", "Hello there", [60, 300, 1080, 100], 80), text("plus", "+", [100, 500, 30, 30], 40)]);
    expect(extractFrameSpec(fr, { width: 1200, height: 1200 }).elements.find((e) => e.name === "plus")?.role).toBe("decoration");
  });
  it("picks the closest brand logo color", () => {
    expect(logoVariantOf(logo([0, 0, 600, 90], [1, 1, 1]))).toBe("white");
    expect(logoVariantOf(logo([0, 0, 600, 90], [0.06, 0.18, 0.13]))).toBe("green-900");
  });
});

describe("issues", () => {
  const codes = (fr: FigmaNode, w: number, h: number) => extractFrameSpec(fr, { width: w, height: h }).issues.map((i) => i.code);
  it("flags a missing headline and logo", () => {
    expect(codes(frame("T_1200x1200", 1200, 1200, []), 1200, 1200)).toEqual(expect.arrayContaining(["no-headline", "no-logo"]));
  });
  it("requires a CTA where the platform adds none, and flags a duplicate where it does", () => {
    const base = [logo([300, 80, 600, 90]), text("h", "Hello there", [60, 300, 1080, 100], 80)];
    expect(codes(frame("T_300x250", 300, 250, base), 300, 250)).toContain("cta-required");
    const withCta = [...base, node("FRAME", "Btn", [450, 900, 300, 90], { fills: solid(0, 0.6, 0.4), children: [text("t", "Go", [480, 920, 240, 50], 32)] })];
    expect(codes(frame("T_1200x1200", 1200, 1200, withCta), 1200, 1200)).toContain("cta-ui-adds");
  });
  it("flags small, fixed and overlapping text", () => {
    const fr = frame("T_1200x1200", 1200, 1200, [logo([300, 80, 600, 90]), text("a", "Hello there", [60, 300, 1080, 100], 80), text("b", "Overlapping", [60, 320, 1080, 100], 70), text("tiny", "fine print", [60, 900, 300, 20], 9, { style: { fontSize: 9, textAutoResize: "NONE" } })]);
    expect(codes(fr, 1200, 1200)).toEqual(expect.arrayContaining(["text-overlap", "text-small", "text-fixed"]));
  });
});

describe("extractTemplateSpec", () => {
  it("handles a page of sized frames and takes the tightest limit across sizes", () => {
    const mk = (w: number, h: number, headline: string) => frame(`Concept_${w}x${h}`, w, h, [logo([w * 0.25, 40, w * 0.5, 60]), text("h", headline, [40, h * 0.3, w - 80, 120], 70)]);
    const root = node("CANVAS", "Page", [0, 0, 4000, 2000], { children: [mk(1200, 1200, "A long headline for the wide one"), mk(1080, 1920, "Short")] });
    const spec = extractTemplateSpec(root, { fileKey: "k" });
    expect(spec.frames.map((f) => `${f.width}x${f.height}`)).toEqual(["1200x1200", "1080x1920"]);
    expect(spec.limits.headline).toBe(Math.min(...spec.frames.map((f) => f.elements.find((e) => e.role === "headline")!.text!.maxChars)));
  });
  it("accepts a link straight to one unsized frame", () => {
    const root = frame("Just a frame", 1080, 1350, [logo([300, 80, 480, 70]), text("h", "Hello there", [60, 300, 960, 100], 80)]);
    expect(extractTemplateSpec(root, { fileKey: "k", nodeId: "1:2" }).frames).toHaveLength(1);
  });
  it("says so when there is nothing to read", () => {
    expect(extractTemplateSpec(node("CANVAS", "Empty", [0, 0, 10, 10], { children: [] }), { fileKey: "k" }).issues[0].code).toBe("no-frames");
  });
  it("hex converts figma colors", () => expect(hex({ r: 1, g: 0.5, b: 0 })).toBe("#FF8000"));
});
