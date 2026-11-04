import { describe, expect, it } from "vitest";
import type { FigmaNode } from "./client";
import { validateTemplate } from "./validate-template";

let n = 0;
const box = (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h });
const node = (name: string, type: string, b: ReturnType<typeof box>, extra: Partial<FigmaNode> = {}, children?: FigmaNode[]): FigmaNode => ({ id: `${++n}:1`, name, type, absoluteBoundingBox: b, children, ...extra });
const text = (name: string, b: ReturnType<typeof box>, extra: Partial<FigmaNode> = {}) => node(name, "TEXT", b, { style: { fontSize: 48, textAutoResize: "HEIGHT" }, ...extra });

function frame(key: string, w: number, h: number, kids: (f: ReturnType<typeof box>) => FigmaNode[], extra: Partial<FigmaNode> = {}) {
  const f = box(0, 0, w, h);
  return node(`AD | ${key} | ${w}x${h}`, "FRAME", f, { clipsContent: true, ...extra }, kids(f));
}
const clean = (f: ReturnType<typeof box>): FigmaNode[] => [
  node("#bg", "RECTANGLE", f, { fills: [{ type: "SOLID" }] }),
  text("#headline[40]", box(60, 60, f.width * 0.6, 200)),
  node("#hero", "RECTANGLE", box(f.width * 0.5, f.height * 0.5, f.width * 0.45, f.height * 0.45), { fills: [{ type: "IMAGE" }] }),
  node("#logo", "INSTANCE", box(60, 20, 120, 24)),
];
const page = (...frames: FigmaNode[]) => node("Page", "CANVAS", box(0, 0, 0, 0), {}, frames);
const codes = (r: ReturnType<typeof validateTemplate>, c: string) => r.concepts.flatMap((x) => x.sizes.flatMap((s) => s.issues)).filter((i) => i.code === c);

describe("validateTemplate", () => {
  it("passes a clean LinkedIn-size frame and notes the sizes still missing", () => {
    const r = validateTemplate(page(frame("YourBrand", 1200, 1200, clean)));
    expect(r.counts.errors).toBe(0);
    expect(r.concepts[0].missingSizes).toContain("1080x1920");
    expect(r.concepts[0].issues.some((i) => i.code === "missing-sizes" && i.severity === "info")).toBe(true);
  });

  it("applies the CTA rule per platform", () => {
    const withCta = (f: ReturnType<typeof box>) => [...clean(f), text("#cta[20]", box(60, 300, 200, 60))];
    expect(codes(validateTemplate(page(frame("A", 1200, 1200, withCta))), "cta-ui-adds")[0].severity).toBe("warn");
    const display = validateTemplate(page(frame("A", 300, 250, clean)));
    expect(codes(display, "cta-required")[0].severity).toBe("error");
    expect(codes(validateTemplate(page(frame("A", 300, 250, withCta))), "cta-required")).toHaveLength(0);
  });

  it("requires headline, bg and logo, and the right layer types", () => {
    const r = validateTemplate(page(frame("A", 1200, 1200, (f) => [node("#bg", "RECTANGLE", f), node("#headline", "RECTANGLE", box(0, 0, 10, 10)), node("#logo", "RECTANGLE", box(0, 0, 10, 10))])));
    const types = codes(r, "slot-type").map((i) => i.message);
    expect(types.some((m) => m.includes("#headline must be a text layer"))).toBe(true);
    expect(types.some((m) => m.includes("#logo must be an instance"))).toBe(true);
    const missing = validateTemplate(page(frame("A", 1200, 1200, (f) => [node("#bg", "RECTANGLE", f)])));
    expect(codes(missing, "missing-slot").map((i) => i.message.slice(0, 18))).toEqual(["Missing #headline.", "Missing #logo. Nam"]);
  });

  it("catches duplicates, unknown and hidden slots, fixed text and a missing clip", () => {
    const r = validateTemplate(page(frame("A", 1200, 1200, (f) => [...clean(f), text("#headline", box(0, 0, 10, 10)), text("#headlin", box(0, 0, 10, 10)), node("#subhead", "TEXT", box(0, 0, 10, 10), { visible: false, style: { fontSize: 8, textAutoResize: "NONE" } })], { clipsContent: false })));
    for (const c of ["duplicate-slot", "unknown-slot", "hidden-slot", "text-fixed", "text-small", "no-clip"]) expect(codes(r, c).length, c).toBeGreaterThan(0);
  });

  it("flags a concept key that ends in a digit, duplicates and a missing image fill", () => {
    const r = validateTemplate(page(frame("Enterprise80", 1200, 1200, (f) => [...clean(f).filter((x) => x.name !== "#hero"), node("#hero", "RECTANGLE", box(0, 0, 100, 100), { fills: [{ type: "SOLID" }] })]), frame("Enterprise80", 1200, 1200, clean)));
    expect(codes(r, "key-ends-digit")[0].severity).toBe("error");
    expect(codes(r, "no-image-fill")).toHaveLength(1);
    expect(r.concepts[0].issues.some((i) => i.code === "duplicate-frame")).toBe(true);
  });

  it("warns when copy sits in the Stories/Reels UI zones", () => {
    const stories = (f: ReturnType<typeof box>) => [...clean(f).filter((x) => !x.name.startsWith("#headline")), text("#headline[40]", box(60, 20, 900, 200))];
    const r = validateTemplate(page(frame("A", 1080, 1920, stories)));
    expect(codes(r, "slot-in-safe-zone").length).toBeGreaterThan(0);
  });

  it("reports unnamed ad-like frames, legacy names and empty pages", () => {
    const bad = node("LI Ad #1_1200x1200", "FRAME", box(0, 0, 1200, 1200));
    const r = validateTemplate(page(bad));
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["no-frames", "name-not-scheme"]));
    expect(r.counts.errors).toBeGreaterThan(0);
    const legacy = validateTemplate(page(frame("X", 1200, 1200, clean, { name: "LI Marketing Ad #1_1200x1200" })), { allowLegacy: true });
    expect(codes(legacy, "name-legacy")).toHaveLength(1);
  });

  it("warns about sizes it doesn't generate", () => {
    expect(codes(validateTemplate(page(frame("A", 1234, 777, clean))), "unknown-size")).toHaveLength(1);
  });
});
