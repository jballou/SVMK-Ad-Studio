import { getAsset, getPreset } from "@/lib/imagery/library";
import { autoTextColor, INK, PAPER, worstContrast } from "./color";
import { area, brandBox, headlinePx, imageAspect, insideCanvas, layerBox, overlapOf, shapeOf, textBox, uncovered, type Box } from "./geometry";
import { LOGO_INFO, LOGO_MIN_CONTRAST, logoContrast, recommendedLogo } from "./logo";
import { placementRule } from "./rules";
import type { Composition, ImageRef, LayerKind } from "./types";

export type Severity = "error" | "warn";
export type FixId = "recommended-logo" | "remove-cta" | "add-cta" | "enable-scrim" | "auto-color" | "reset-layer" | "hide-layer" | "background-to-bottom" | "reduce-headline-size" | "fit-resolution" | "scale-to-fill" | "extend-blur" | "reset-text";

export interface QaIssue {
  id: string;
  severity: Severity;
  message: string;
  target?: LayerKind | "headline" | "cta";
  fix?: { id: FixId; label: string };
  /** A second way to resolve the same issue. */
  alsoFix?: { id: FixId; label: string };
}

/** How much of the ad a full-bleed photo leaves empty (0 when it isn't full-bleed or has no image). */
export function photoGap(c: Composition, w: number, h: number): number {
  const l = c.layers.photo;
  if (!l.visible || !l.bleed || !l.image) return 0;
  return uncovered(layerBox(l, imageAspect(l.image), w, h));
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
const isCustom = (r?: ImageRef): r is Exclude<ImageRef, { source: "gallery" }> => !!r && r.source !== "gallery";

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
  // Serif bold averages ~0.58em per character, and word wrapping wastes roughly an eighth of each line.
  const cpl = ((tb.w * w) / (px * 0.58)) * 0.88;
  const lines = Math.ceil(head.length / Math.max(1, cpl));
  const needed = lines * px * 1.12 + (t.showCta && shape !== "banner" ? px * 2 : 0);
  if (head && needed > tb.h * h * 1.02) add({ id: "headline-fit", severity: "warn", target: "headline", message: "The headline probably won't fit its area at this size. Shorten it or reduce the size.", fix: t.headlineScale > 0.8 ? { id: "reduce-headline-size", label: "Set size to 100%" } : undefined });

  // Imagery.
  const bgIdx = c.order.indexOf("background");
  const bgVisible = c.layers.background.visible;
  const off = { dx: t.dx ?? 0, dy: t.dy ?? 0 };
  const textBoxBox: Box = { ...tb, x: tb.x + off.dx, y: tb.y + off.dy };
  if (off.dx || off.dy) {
    if (rule.safe && (textBoxBox.y < rule.safe.top - 0.001 || textBoxBox.y + textBoxBox.h > 1 - rule.safe.bottom + 0.001)) add({ id: "text-safe-zone", severity: "warn", target: "headline", message: "The headline has moved into the area covered by the platform's UI (Stories and Reels top and bottom).", fix: { id: "reset-text", label: "Reset text position" } });
    if (overlapOf(brandBox(w, h, rule.safe), textBoxBox) > 0.1) add({ id: "text-over-logo", severity: "warn", target: "headline", message: "The headline overlaps the brand mark.", fix: { id: "reset-text", label: "Reset text position" } });
  }
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
    if (kind === "photo" && l.bleed) {
      const gap = uncovered(box);
      if (gap > 0.002 && l.extend !== "blur") add({ id: "photo-gap", severity: "error", target: "photo", message: `The photo doesn't fill the ad: ${Math.round(gap * 100)}% of it is empty. Scale it up to cover, or extend the background.`, fix: { id: "scale-to-fill", label: "Scale photo to fill" }, alsoFix: { id: "extend-blur", label: "Extend with blurred edges" } });
      else if (gap > 0.35) add({ id: "photo-extend-large", severity: "warn", target: "photo", message: `${Math.round(gap * 100)}% of the ad is the extended background, which will look noticeably soft. A larger photo or Scale to fill looks better.`, fix: { id: "scale-to-fill", label: "Scale photo to fill" } });
    } else if (inside < (kind === "product" ? 0.85 : 0.6)) add({ id: `${kind}-cropped`, severity: "warn", target: kind, message: `${Math.round((1 - inside) * 100)}% of the ${label(kind).toLowerCase()} falls outside the ad.`, fix: { id: "reset-layer", label: "Reset position" } });
    if (rule.safe && kind === "product") {
      const zone = overlapOf(box, { x: 0, y: 0, w: 1, h: rule.safe.top }) + overlapOf(box, { x: 0, y: 1 - rule.safe.bottom, w: 1, h: rule.safe.bottom });
      if (zone > 0.2) add({ id: "product-safe-zone", severity: "warn", target: "product", message: "Part of the product sits where Stories and Reels UI covers the ad. Keep it inside the safe area.", fix: { id: "reset-layer", label: "Reset position" } });
    }
    if (isCustom(l.image)) {
      const approved = l.image.source === "asset" && l.image.approved;
      if (!approved) add({ id: `${kind}-unapproved`, severity: "warn", target: kind, message: `"${l.image.name}" isn't in the approved library. Get brand review before launch.` });
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

  // Brand mark: needs enough contrast to be seen, and Green 900 is for occasional use.
  const logo = c.logo ?? "green";
  const rec = recommendedLogo(bgs);
  const lc = logoContrast(logo, bgs);
  if (lc < LOGO_MIN_CONTRAST) add({ id: "logo-contrast", severity: "error", message: `The ${LOGO_INFO[logo].label} logo has only ${lc.toFixed(1)}:1 contrast on this background (needs ${LOGO_MIN_CONTRAST}:1). ${LOGO_INFO[rec].label} would work.`, fix: { id: "recommended-logo", label: `Use the ${LOGO_INFO[rec].label} logo` } });
  else if (logo === "green-900") add({ id: "logo-green-900", severity: "warn", message: "Green 900 is for occasional use. Use the standard Green logo unless it clashes with this background.", fix: rec === "green" ? { id: "recommended-logo", label: "Use the Green logo" } : undefined });
  else if (logo === "white" && rec === "green") add({ id: "logo-white-optional", severity: "warn", message: "The white logo is meant for dark backgrounds. The standard Green logo has enough contrast here.", fix: { id: "recommended-logo", label: "Use the Green logo" } });

  return out;
}

export const hasErrors = (issues: QaIssue[]) => issues.some((i) => i.severity === "error");
export const counts = (issues: QaIssue[]) => ({ errors: issues.filter((i) => i.severity === "error").length, warnings: issues.filter((i) => i.severity === "warn").length });
export { getAsset };
