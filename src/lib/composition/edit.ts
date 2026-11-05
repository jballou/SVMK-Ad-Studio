import { resetSize, resolveComposition, withTransform } from "./defaults";
import { clampToCover, coverScale, imageAspect, layerBox, textBox } from "./geometry";
import { clampLogoScale } from "./logo";
import { placementRule } from "./rules";
import { recommendedLogo, type LogoVariant } from "./logo";
import { backgroundColors } from "./qa";
import type { FixId } from "./qa";
import { LAYER_KINDS, type Design, type ImageRef, type LayerKind, type Transform } from "./types";

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Keeps a layer's center within a generous margin around the canvas so it can bleed but not be lost. */
export function clampTransform(t: Transform): Transform {
  return { x: round3(clamp(t.x, -0.25, 1.25)), y: round3(clamp(t.y, -0.25, 1.25)), scale: round3(clamp(t.scale, MIN_SCALE, MAX_SCALE)) };
}

export const nudge = (t: Transform, dx: number, dy: number) => clampTransform({ ...t, x: t.x + dx, y: t.y + dy });
export const resize = (t: Transform, ds: number) => clampTransform({ ...t, scale: t.scale + ds });

function updateContent(d: Design, f: (c: Design["content"]) => Design["content"]): Design {
  return { ...d, content: f(d.content) };
}

export function setVisible(d: Design, kind: LayerKind, visible: boolean): Design {
  return updateContent(d, (c) => ({ ...c, layers: { ...c.layers, [kind]: { ...c.layers[kind], visible } } }));
}

export function setImage(d: Design, kind: "photo" | "product", image: ImageRef): Design {
  return updateContent(d, (c) => ({ ...c, layers: { ...c.layers, [kind]: { ...c.layers[kind], image, visible: true } } }));
}

export function setPreset(d: Design, preset: string): Design {
  return updateContent(d, (c) => ({ ...c, layers: { ...c.layers, background: { ...c.layers.background, preset, visible: true } } }));
}

/** Moves a layer one step later (dir 1, toward the top of the stack) or earlier (dir -1). */
export function moveLayer(d: Design, kind: LayerKind, dir: -1 | 1): Design {
  const order = [...d.content.order];
  const i = order.indexOf(kind);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return d;
  [order[i], order[j]] = [order[j], order[i]];
  return updateContent(d, (c) => ({ ...c, order }));
}

export function setText(d: Design, patch: Partial<Design["content"]["text"]>): Design {
  return updateContent(d, (c) => ({ ...c, text: { ...c.text, ...patch } }));
}

export function setLogo(d: Design, logo: LogoVariant): Design {
  return updateContent(d, (c) => ({ ...c, logo }));
}

/** Resizes the brand mark, within the allowed range. */
export function setLogoScale(d: Design, scale: number): Design {
  return updateContent(d, (c) => ({ ...c, logoScale: clampLogoScale(scale) }));
}

/** Moves the headline for one size. The offset is clamped so the text box stays inside the canvas. */
export function setTextOffset(d: Design, w: number, h: number, placementKey: string, dx: number, dy: number): Design {
  const tb = textBox(w, h, placementRule(placementKey).safe);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const off = { dx: r(clamp(dx, -tb.x, 1 - tb.x - tb.w)), dy: r(clamp(dy, -tb.y, 1 - tb.y - tb.h)) };
  return { ...d, textOffsets: { ...d.textOffsets, [`${w}x${h}`]: off } };
}

export function resetTextOffset(d: Design, w: number, h: number): Design {
  const { [`${w}x${h}`]: _drop, ...rest } = d.textOffsets ?? {};
  void _drop;
  return { ...d, textOffsets: rest };
}

/** Turns the photo into a full-bleed background (or back into a free-floating image) at every size. */
export function setBleed(d: Design, on: boolean): Design {
  const transforms = Object.fromEntries(Object.entries(d.transforms).map(([k, v]) => { const { photo: _p, ...rest } = v; void _p; return [k, rest]; }));
  const next = updateContent({ ...d, transforms }, (c) => ({ ...c, layers: { ...c.layers, photo: { ...c.layers.photo, bleed: on, extend: "none" as const, visible: true } } }));
  return on ? updateContent(next, (c) => ({ ...c, order: ["background", "photo", ...c.order.filter((k) => k !== "background" && k !== "photo")] })) : next;
}

export function setExtend(d: Design, extend: "none" | "blur"): Design {
  return updateContent(d, (c) => ({ ...c, layers: { ...c.layers, photo: { ...c.layers.photo, extend } } }));
}

export function setCtaFor(d: Design, placementKey: string, show: boolean): Design {
  return updateContent(d, (c) => ({ ...c, text: { ...c.text, ctaOverride: { ...c.text.ctaOverride, [placementKey]: show } } }));
}

export function applyFix(d: Design, fix: FixId, ctx: { width: number; height: number; placementKey: string; target?: string; themeBg?: string }): Design {
  const kind = LAYER_KINDS.find((k) => k === ctx.target);
  switch (fix) {
    case "recommended-logo": {
      const comp = resolveComposition(d, ctx.width, ctx.height, ctx.placementKey);
      return setLogo(d, recommendedLogo(backgroundColors(comp, ctx.themeBg ?? "#FFFFFF")));
    }
    case "remove-cta": return setCtaFor(d, ctx.placementKey, false);
    case "add-cta": return setCtaFor(d, ctx.placementKey, true);
    case "enable-scrim": return setText(d, { scrim: true });
    case "auto-color": return setText(d, { color: "auto" });
    case "reduce-headline-size": return setText(d, { headlineScale: 1 });
    case "reset-layer": return resetSize(d, ctx.width, ctx.height, kind);
    case "hide-layer": return kind ? setVisible(d, kind, false) : d;
    case "fit-resolution": {
      const l = kind && kind !== "background" ? d.content.layers[kind].image : undefined;
      if (!kind || !l || l.source === "gallery") return d;
      const cur = resolveComposition(d, ctx.width, ctx.height, ctx.placementKey).layers[kind];
      return withTransform(d, ctx.width, ctx.height, kind, clampTransform({ x: cur.x, y: cur.y, scale: Math.min(cur.scale, l.naturalW / ctx.width) }));
    }
    case "scale-to-fill": {
      const img = d.content.layers.photo.image;
      if (!img) return d;
      const cur = resolveComposition(d, ctx.width, ctx.height, ctx.placementKey).layers.photo;
      const aspect = imageAspect(img);
      const scale = Math.max(cur.scale, coverScale(aspect, ctx.width, ctx.height));
      const box = layerBox({ x: cur.x, y: cur.y, scale }, aspect, ctx.width, ctx.height);
      const pos = clampToCover(cur, box);
      return withTransform(d, ctx.width, ctx.height, "photo", clampTransform({ ...pos, scale }));
    }
    case "extend-blur": return setExtend(d, "blur");
    case "reset-text": return resetTextOffset(d, ctx.width, ctx.height);
    case "background-to-bottom": return updateContent(d, (c) => ({ ...c, order: ["background", ...c.order.filter((k) => k !== "background")] }));
  }
}

/** Removes browser-only data (uploaded file contents) before a design is sent to the server. */
export function stripUploads(d: Design): Design {
  const strip = (r?: ImageRef): ImageRef | undefined => (r && r.source === "upload" ? { source: "upload", name: r.name, naturalW: r.naturalW, naturalH: r.naturalH } : r);
  return updateContent(d, (c) => ({ ...c, layers: { ...c.layers, photo: { ...c.layers.photo, image: strip(c.layers.photo.image) }, product: { ...c.layers.product, image: strip(c.layers.product.image) } } }));
}
