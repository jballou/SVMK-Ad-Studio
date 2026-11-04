import { describe, expect, it } from "vitest";
import { CONCEPTS, THEMES } from "@/lib/dummy/concepts";
import { conceptImagery, designForConcept } from "@/lib/dummy/library";
import { PLACEMENTS } from "@/lib/specs/platforms";
import { contrast } from "./color";
import { defaultDesign, resetSize, resolveComposition, withTransform } from "./defaults";
import { hasErrors, qaComposition, type QaContext } from "./qa";
import { ctaDefault } from "./rules";

const concept = CONCEPTS.find((c) => c.key === "GetInsights")!; // Intent: photo + product
const ctx = (placementKey: string, width: number, height: number, supports = conceptImagery(concept)): QaContext => ({ placementKey, width, height, supports, themeBg: THEMES[concept.theme].bg });

describe("platform CTA rules", () => {
  it("defaults to no CTA where the platform UI adds one, and a CTA elsewhere", () => {
    expect(ctaDefault("linkedin-single-image")).toBe(false);
    expect(ctaDefault("instagram-feed")).toBe(false);
    expect(ctaDefault("meta-stories-reels")).toBe(false);
    expect(ctaDefault("display-standard")).toBe(true);
    expect(ctaDefault("newsletter")).toBe(true);
  });
  it("flags a CTA baked into a LinkedIn image and a missing one on Display", () => {
    const d = designForConcept(concept);
    const li = resolveComposition({ ...d, content: { ...d.content, text: { ...d.content.text, ctaOverride: { "linkedin-single-image": true } } } }, 1200, 1200, "linkedin-single-image");
    const issue = qaComposition(li, ctx("linkedin-single-image", 1200, 1200)).find((i) => i.id === "cta-ui-adds");
    expect(issue).toMatchObject({ severity: "warn", fix: { id: "remove-cta" } });

    const disp = resolveComposition({ ...d, content: { ...d.content, text: { ...d.content.text, ctaOverride: { "display-standard": false } } } }, 300, 250, "display-standard");
    expect(qaComposition(disp, ctx("display-standard", 300, 250)).find((i) => i.id === "cta-missing")).toMatchObject({ severity: "error", fix: { id: "add-cta" } });
  });
});

describe("default designs", () => {
  it("never produce QA errors for any concept, placement or size", () => {
    const bad: string[] = [];
    for (const c of CONCEPTS) {
      const d = designForConcept(c);
      for (const p of PLACEMENTS) for (const s of p.sizes) {
        const comp = resolveComposition(d, s.w, s.h, p.key);
        const issues = qaComposition(comp, { placementKey: p.key, width: s.w, height: s.h, supports: conceptImagery(c), themeBg: THEMES[c.theme].bg });
        for (const i of issues.filter((x) => x.severity === "error")) bad.push(`${c.key} ${p.key} ${s.w}x${s.h}: ${i.id}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it("only enable layers the concept supports, and at most two imagery layers", () => {
    for (const c of CONCEPTS) {
      const d = designForConcept(c);
      const s = conceptImagery(c);
      expect(d.content.layers.photo.visible).toBe(s.photo);
      expect(d.content.layers.product.visible).toBe(s.product);
      expect(Object.values(s).filter(Boolean).length).toBeLessThanOrEqual(2);
    }
  });
  it("keeps images out of the headline area", () => {
    const d = designForConcept(concept);
    for (const [w, h, p] of [[1080, 1080, "facebook-feed"], [1200, 628, "linkedin-single-image"], [1080, 1350, "instagram-feed"], [1080, 1920, "meta-stories-reels"]] as const) {
      const issues = qaComposition(resolveComposition(d, w, h, p), ctx(p, w, h));
      expect(issues.find((i) => i.id === "text-over-photo")).toBeUndefined();
    }
  });
});

describe("QA rules", () => {
  const base = designForConcept(concept);
  const resolve = (d = base, w = 1080, h = 1080, p = "facebook-feed") => resolveComposition(d, w, h, p);

  it("warns when the background is stacked over a visible layer", () => {
    const d = { ...base, content: { ...base.content, order: ["photo", "background", "product"] as const } };
    const issues = qaComposition(resolve({ ...d, content: { ...d.content, order: [...d.content.order] } }), ctx("facebook-feed", 1080, 1080));
    expect(issues.find((i) => i.id === "photo-hidden")?.fix?.id).toBe("background-to-bottom");
  });
  it("warns about unapproved uploads and errors on tiny ones", () => {
    const up = { source: "upload" as const, name: "team.jpg", naturalW: 100, naturalH: 100 };
    const d = { ...base, content: { ...base.content, layers: { ...base.content.layers, photo: { visible: true, image: up } } } };
    const issues = qaComposition(resolve(d), ctx("facebook-feed", 1080, 1080));
    expect(issues.some((i) => i.id === "photo-unapproved" && i.severity === "warn")).toBe(true);
    expect(issues.some((i) => i.id === "photo-lowres" && i.severity === "error")).toBe(true);
  });
  it("errors when an unsupported or empty layer is on", () => {
    const d = defaultDesign({ key: "X", personas: [], supports: { photo: true, product: false }, headline: "Hello", cta: "Go", align: "left" });
    const on = { ...d, content: { ...d.content, layers: { ...d.content.layers, product: { visible: true, image: { source: "gallery" as const, id: "product-survey" } } } } };
    expect(qaComposition(resolve(on), ctx("facebook-feed", 1080, 1080, { photo: true, product: false })).some((i) => i.id === "product-unsupported")).toBe(true);
    const empty = { ...d, content: { ...d.content, layers: { ...d.content.layers, photo: { visible: true } } } };
    expect(qaComposition(resolve(empty), ctx("facebook-feed", 1080, 1080, { photo: true, product: false })).some((i) => i.id === "photo-empty")).toBe(true);
  });
  it("flags low contrast when the text color is forced", () => {
    const d = { ...base, content: { ...base.content, text: { ...base.content.text, color: "light" as const }, layers: { ...base.content.layers, background: { visible: true, preset: "sand" } } } };
    const issue = qaComposition(resolve(d), ctx("facebook-feed", 1080, 1080)).find((i) => i.id.startsWith("contrast"));
    expect(issue?.severity).toBe("error");
    expect(contrast("#FFFFFF", "#F7F5F3")).toBeLessThan(3);
  });
  it("flags a product pushed under the Stories bottom UI and offers a reset", () => {
    const moved = withTransform(base, 1080, 1920, "product", { x: 0.5, y: 0.85, scale: 0.5 });
    const issue = qaComposition(resolve(moved, 1080, 1920, "meta-stories-reels"), ctx("meta-stories-reels", 1080, 1920)).find((i) => i.id === "product-safe-zone");
    expect(issue?.fix?.id).toBe("reset-layer");
    const reset = resetSize(moved, 1080, 1920, "product");
    expect(qaComposition(resolve(reset, 1080, 1920, "meta-stories-reels"), ctx("meta-stories-reels", 1080, 1920)).some((i) => i.id === "product-safe-zone")).toBe(false);
  });
  it("flags an overlong headline on a banner and tiny text", () => {
    const long = { ...base, content: { ...base.content, text: { ...base.content.text, headline: "x".repeat(70) } } };
    const issues = qaComposition(resolve(long, 728, 90, "display-standard"), ctx("display-standard", 728, 90));
    expect(issues.some((i) => i.id === "headline-long")).toBe(true);
    const tiny = { ...base, content: { ...base.content, text: { ...base.content.text, headlineScale: 0.3 } } };
    expect(hasErrors(qaComposition(resolve(tiny, 300, 250, "display-standard"), ctx("display-standard", 300, 250)))).toBe(true);
  });
});

import { applyFix, clampTransform, moveLayer, nudge, resize, setCtaFor, setImage, stripUploads } from "./edit";

describe("editing helpers", () => {
  const d = designForConcept(concept);
  it("clamps position and size", () => {
    expect(clampTransform({ x: 9, y: -9, scale: 9 })).toEqual({ x: 1.25, y: -0.25, scale: 1.6 });
    expect(nudge({ x: 0.5, y: 0.5, scale: 0.4 }, 0.01, -0.05)).toEqual({ x: 0.51, y: 0.45, scale: 0.4 });
    expect(resize({ x: 0.5, y: 0.5, scale: 0.06 }, -0.1).scale).toBe(0.05);
  });
  it("reorders layers within bounds", () => {
    expect(moveLayer(d, "photo", 1).content.order).toEqual(["background", "product", "photo"]);
    expect(moveLayer(d, "background", -1)).toBe(d);
  });
  it("applies QA fixes", () => {
    const withCta = setCtaFor(d, "linkedin-single-image", true);
    expect(applyFix(withCta, "remove-cta", { width: 1200, height: 1200, placementKey: "linkedin-single-image" }).content.text.ctaOverride["linkedin-single-image"]).toBe(false);
    const buried = { ...d, content: { ...d.content, order: ["photo", "background", "product"] as ("photo" | "background" | "product")[] } };
    expect(applyFix(buried, "background-to-bottom", { width: 1, height: 1, placementKey: "x" }).content.order[0]).toBe("background");
  });
  it("shrinks an oversized upload to its sharp size", () => {
    const up = setImage(d, "photo", { source: "upload", name: "a.png", naturalW: 400, naturalH: 400 });
    const before = resolveComposition(up, 1080, 1080, "facebook-feed").layers.photo.scale;
    expect(before * 1080).toBeGreaterThan(400);
    const fixed = applyFix(up, "fit-resolution", { width: 1080, height: 1080, placementKey: "facebook-feed", target: "photo" });
    expect(resolveComposition(fixed, 1080, 1080, "facebook-feed").layers.photo.scale * 1080).toBeLessThanOrEqual(400.5);
  });
  it("strips uploaded file contents but keeps metadata", () => {
    const up = setImage(d, "photo", { source: "upload", name: "a.png", naturalW: 10, naturalH: 20, src: "data:image/png;base64,AAAA" });
    expect(stripUploads(up).content.layers.photo.image).toEqual({ source: "upload", name: "a.png", naturalW: 10, naturalH: 20 });
  });
});
