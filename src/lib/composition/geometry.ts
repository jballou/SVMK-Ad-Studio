import { getAsset } from "@/lib/imagery/library";
import type { ImageRef, Transform } from "./types";

export type Shape = "banner" | "landscape" | "square" | "portrait";
export interface Box { x: number; y: number; w: number; h: number }
export interface Safe { top: number; bottom: number }

export function shapeOf(w: number, h: number): Shape {
  const r = w / h;
  if (r > 3) return "banner";
  if (r > 1.3) return "landscape";
  if (r >= 0.8) return "square";
  return "portrait";
}

/** Where the headline (and CTA) live, as fractions of the canvas. Platform safe zones push it down. */
export function textBox(w: number, h: number, safe?: Safe): Box {
  const top = safe ? safe.top + 0.02 : 0;
  switch (shapeOf(w, h)) {
    case "banner": return { x: 0.03, y: 0.1, w: 0.52, h: 0.8 };
    case "landscape": return { x: 0.06, y: 0.12 + top, w: 0.5, h: 0.76 - top };
    default: return { x: 0.07, y: top + 0.12, w: 0.86, h: safe ? 0.2 : 0.34 };
  }
}

export function brandBox(w: number, h: number, safe?: Safe): Box | undefined {
  if (shapeOf(w, h) === "banner") return undefined;
  const top = safe ? safe.top + 0.02 : 0;
  return { x: 0.07, y: top + 0.04, w: 0.22, h: 0.05 };
}

/** Headline font size in px at 1x, matching the CSS the renderer uses. */
export function headlinePx(w: number, h: number, scale: number): number {
  const s = shapeOf(w, h);
  const base = s === "banner" ? Math.min(0.3 * h, 0.045 * w) : s === "landscape" ? 0.09 * h : w / h < 0.5 ? 0.1 * w : 0.062 * Math.min(w, h);
  return base * scale;
}

/** CSS font-size for the headline, in container-query units. */
export function headlineCss(w: number, h: number, scale: number): string {
  const s = shapeOf(w, h);
  if (s === "banner") return `min(${30 * scale}cqh, ${4.5 * scale}cqw)`;
  if (s === "landscape") return `${9 * scale}cqh`;
  return w / h < 0.5 ? `${10 * scale}cqw` : `${6.2 * scale}cqmin`;
}

export function imageAspect(ref: ImageRef | undefined): number {
  if (!ref) return 1;
  if (ref.source === "gallery") {
    const a = getAsset(ref.id);
    return a ? a.naturalH / a.naturalW : 1;
  }
  return ref.naturalH / ref.naturalW;
}

/** Top-left box of an image layer, in canvas fractions. */
export function layerBox(t: Transform, aspect: number, w: number, h: number): Box {
  const bw = t.scale;
  const bh = t.scale * aspect * (w / h);
  return { x: t.x - bw / 2, y: t.y - bh / 2, w: bw, h: bh };
}

export const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);

export function intersect(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y };
}

/** Fraction of `a` that lies inside the canvas (0..1). */
export function insideCanvas(a: Box): number {
  const inter = intersect(a, { x: 0, y: 0, w: 1, h: 1 });
  return area(a) === 0 ? 1 : area(inter) / area(a);
}

export function overlapOf(a: Box, withBox: Box): number {
  return area(a) === 0 ? 0 : area(intersect(a, withBox)) / area(a);
}
