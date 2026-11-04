import { getAsset, getPreset } from "@/lib/imagery/library";
import { autoTextColor, INK, PAPER, worstContrast } from "./color";
import { area, brandBox, headlinePx, imageAspect, insideCanvas, layerBox, overlapOf, shapeOf, textBox, type Box } from "./geometry";
import { placementRule } from "./rules";
import type { Composition, ImageRef, LayerKind } from "./types";

export type Severity = "error" | "warn";
export type FixId = "remove-cta" | "add-cta" | "enable-scrim" | "auto-color" | "reset-layer" | "hide-layer" | "background-to-bottom" | "reduce-headline-size" | "fit-resolution";

export interface QaIssue {
  id: string;
  severity: Severity;
  message: string;
  target?: LayerKind | "headline" | "cta";
  fix?: { id: FixId; label: string };
}

export interface QaContext {
  placementKey: string;
  width: number;
  height: number;
  supports: { photo: boolean; product: boolean };
  /** The concept's own background color, used by the "Concept color" preset. */
  themeBg: string;
}

export function backgroundColors(c: Composition, themeBg: string): string[] {
  const bg = c.layers.background;
  if (!bg.visible) return [PAPER];
  const p = getPreset(bg.preset);
  return !p || p.id === "theme" ? [themeBg] : p.colors;
}

export function resolveTextColor(c: Composition, themeBg: string): string {
  if (c.text.color === "dark") return INK;
  if (c.text.color === "light") return PAPER;
  return autoTextColor(backgroundColors(c, themeBg));
}

const label = (k: LayerKind) => (k === "photo" ? "Photo" : k === "product" ? "Product image" : "Background");
const isUpload = (r?: ImageRef): r is Extract<ImageRef, { source: "upload" }> => r?.source === "upload";

export function qaComposition(c: Composition, ctx: QaContext): QaIssue[] {
  const out: QaIssue[] = [];
  const { width: w, height: h } = ctx;
  const rule = placementRule(ctx.placementKey);
  const shape = shapeOf(w, h);
  const tb = textBox(w, h, rule.safe);
  const t = c.text;
  const add = (i: QaIssue) => out.push(i);

  // CTA: the platform UI adds one on LinkedIn and Meta; Display and newsletter creatives carry their own.
  if (t.showCta && rule.uiAddsCta) add({ id: "cta-ui-adds", severity: "warn", target: "cta", message: `${rule.platform === "linkedin" ? "LinkedIn" : "Meta"} adds its own CTA button, so the image shouldn't carry one.`, fix: { id: "remove-cta", label: "Remove CTA from image" } });
  if (!t.showCta && rule.ctaRequired) add({ id: "cta-missing", severity: "error", target: "cta", message: "Display and newsletter ads need a CTA in the creative; there's no platform button.", fix: { id: "add-cta", label: "Add CTA" } });
  if (t.showCta && !t.cta.trim()) add({ id: "cta-empty", severity: "error", target: "cta", message: "The CTA button has no text." });
  if (t.showCta && t.cta.length > 24) add({ id: "cta-long", severity: "warn", target: "cta", message: `CTA is ${t.cta.length} characters; keep it under 24 so it fits the button.` });

  // Headline.
  const head = t.headline.trim();
  const max = shape === "banner" ? 45 : w * h < 100_000 ? 55 : 85;
  if (!head) add({ id: "headline-empty", severity: "error", target: "headline", message: "The headline is empty." });
  else if (head.length > max) add({ id: "headline-long", severity: "warn", target: "headline", message: `Headline is ${head.length} characters; ${max} is the most this size holds comfortably.` });
  const px = headlinePx(w, h, t.headlineScale);
  if (px < 12) add({ id: "font-small", severity: "error", target: "headline", message: `Headline renders at about ${px.toFixed(0)}px, which is too small to read.`, fix: { id: "reduce-headline-size", label: "Set size to 100%" } });
  const cpl = (tb.w * w) / (px * 0.52);
  const lines = Math.ceil(head.length / Math.max(1, cpl));
  const needed = lines * px * 1.12 + (t.showCta && shape !== "banner" ? px * 2 : 0);
  if (head && needed > tb.h * h * 1.02) add({ id: "headline-fit", severity: "warn", target: "headline", message: "The headline probably won't fit its area at this size. Shorten it or reduce the size.", fix: t.headlineScale > 0.8 ? { id: "reduce-headline-size", label: "Set size to 100%" } : undefined });

  // Imagery.
  const bgIdx = c.order.indexOf("background");
  const bgVisible = c.layers.background.visible;
  const textBoxBox: Box = tb;
  let imageryCount = 0;
  for (const kind of ["photo", "product"] as const) {
    const l = c.layers[kind];
    if (!l.visible) continue;
    imageryCount++;
    if (!ctx.supports[kind]) add({ id: `${kind}-unsupported`, severity: "error", target: kind, message: `${label(kind)} isn't part of this concept's template.`, fix: { id: "hide-layer", label: "Turn off" } });
    if (!l.image) { add({ id: `${kind}-empty`, severity: "error", target: kind, message: `${label(kind)} is on but no image is selected.` }); continue; }

    const aspect = imageAspect(l.image);
    const box = layerBox(l, aspect, w, h);
    if (bgVisible && bgIdx > c.order.indexOf(kind)) add({ id: `${kind}-hidden`, severity: "warn", target: kind, message: `${label(kind)} sits under the background, so it's hidden.`, fix: { id: "background-to-bottom", label: "Move background to bottom" } });
    const inside = insideCanvas(box);
    if (inside < (kind === "product" ? 0.85 : 0.6)) add({ id: `${kind}-cropped`, severity: "warn", target: kind, message: `${Math.round((1 - inside) * 100)}% of the ${label(kind).toLowerCase()} falls outside the ad.`, fix: { id: "reset-layer", label: "Reset position" } });
    if (rule.safe && kind === "product") {
      const zone = overlapOf(box, { x: 0, y: 0, w: 1, h: rule.safe.top }) + overlapOf(box, { x: 0, y: 1 - rule.safe.bottom, w: 1, h: rule.safe.bottom });
      if (zone > 0.2) add({ id: "product-safe-zone", severity: "warn", target: "product", message: "Part of the product sits where Stories and Reels UI covers the ad. Keep it inside the safe area.", fix: { id: "reset-layer", label: "Reset position" } });
    }
    if (isUpload(l.image)) {
      add({ id: `${kind}-unapproved`, severity: "warn", target: kind, message: `"${l.image.name}" isn't in the approved library. Get brand review before launch.` });
      const rendered = l.scale * w;
      if (l.image.naturalW < rendered * 0.5) add({ id: `${kind}-lowres`, severity: "error", target: kind, message: `"${l.image.name}" is ${l.image.naturalW}px wide but needs about ${Math.round(rendered)}px at this size, so it will look blurry.`, fix: { id: "fit-resolution", label: "Shrink to its sharp size" } });
      else if (l.image.naturalW < rendered) add({ id: `${kind}-softres`, severity: "warn", target: kind, message: `"${l.image.name}" is ${l.image.naturalW}px wide; ${Math.round(rendered)}px would be sharper at this size.` });
    }
    // Text on top of a photo needs a scrim (or a move) to stay legible.
    if (kind === "photo" && !t.scrim && c.order.indexOf("photo") >= 0 && overlapOf(textBoxBox, box) > 0.2 && area(box) > 0) add({ id: "text-over-photo", severity: "warn", target: "headline", message: "The headline overlaps the photo, which can hurt legibility.", fix: { id: "enable-scrim", label: "Add text scrim" } });
  }
  if (shape === "banner" && imageryCount > 1) add({ id: "banner-crowded", severity: "warn", message: "Banners this short only have room for one image layer.", fix: { id: "hide-layer", label: "Turn off product" }, target: "product" });

  // Contrast.
  const bgs = backgroundColors(c, ctx.themeBg);
  const color = resolveTextColor(c, ctx.themeBg);
  const ratio = worstContrast(color, bgs);
  if (ratio < 3) add({ id: "contrast-low", severity: "error", target: "headline", message: `Headline contrast is ${ratio.toFixed(1)}:1 against the background (3:1 is the minimum for large text).`, fix: t.color !== "auto" ? { id: "auto-color", label: "Use automatic text color" } : undefined });
  else if (ratio < 4.5) add({ id: "contrast-ok-large", severity: "warn", target: "headline", message: `Headline contrast is ${ratio.toFixed(1)}:1: fine for large text, but small text such as the brand name falls short of 4.5:1.`, fix: t.color !== "auto" ? { id: "auto-color", label: "Use automatic text color" } : undefined });

  // Brand mark must stay clear of platform UI.
  const bm = brandBox(w, h, rule.safe);
  if (!bm && shape !== "banner") add({ id: "brand-missing", severity: "error", message: "The brand mark is missing." });

  return out;
}

export const hasErrors = (issues: QaIssue[]) => issues.some((i) => i.severity === "error");
export const counts = (issues: QaIssue[]) => ({ errors: issues.filter((i) => i.severity === "error").length, warnings: issues.filter((i) => i.severity === "warn").length });
export { getAsset };
