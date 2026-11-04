import { PHOTOS, PRODUCTS, type ImageryAsset } from "@/lib/imagery/library";
import { imageAspect, shapeOf, textBox } from "./geometry";
import { ctaDefault, placementRule } from "./rules";
import { LAYER_KINDS, sizeKey, type Composition, type Design, type ImageRef, type LayerKind, type Transform } from "./types";

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Deterministic pick that prefers assets whose tags match the concept's personas. */
export function pickAsset(pool: ImageryAsset[], key: string, personas: string[]): ImageryAsset {
  const scored = pool.map((a) => ({ a, s: a.tags.filter((t) => personas.includes(t)).length }));
  const best = Math.max(...scored.map((x) => x.s));
  const cands = scored.filter((x) => x.s === best).map((x) => x.a);
  return cands[hash(key) % cands.length];
}

export interface DefaultDesignInput {
  key: string;
  personas: string[];
  supports: { photo: boolean; product: boolean };
  headline: string;
  cta: string;
  align: "left" | "center";
  bgPreset?: string;
}

export function defaultDesign(i: DefaultDesignInput): Design {
  const photo: ImageRef = { source: "gallery", id: pickAsset(PHOTOS, i.key, i.personas).id };
  const product: ImageRef = { source: "gallery", id: pickAsset(PRODUCTS, `${i.key}:p`, i.personas).id };
  return {
    supports: i.supports,
    transforms: {},
    content: {
      order: ["background", "photo", "product"],
      layers: {
        background: { visible: true, preset: i.bgPreset ?? "theme" },
        photo: { visible: i.supports.photo, image: photo },
        product: { visible: i.supports.product, image: product },
      },
      text: { headline: i.headline, headlineScale: 1, align: i.align, color: "auto", scrim: false, cta: i.cta, ctaOverride: {} },
    },
  };
}

interface Ctx { aspect: number; hasPhoto: boolean; hasProduct: boolean }

/** Sensible starting position for a layer, based on the canvas shape and what else is on it. */
export function defaultTransform(kind: LayerKind, w: number, h: number, safe: { top: number; bottom: number } | undefined, c: Ctx): Transform {
  if (kind === "background") return { x: 0.5, y: 0.5, scale: 1 };
  const r = w / h;
  const shape = shapeOf(w, h);
  const both = c.hasPhoto && c.hasProduct;
  const fit = (maxS: number, availH: number) => Math.min(maxS, availH / (c.aspect * r));
  const hFrac = (s: number) => s * c.aspect * r;

  if (shape === "banner") return { x: 0.92, y: 0.5, scale: fit(0.1, 0.9) };
  if (shape === "landscape") {
    if (kind === "photo") return { x: 0.79, y: 0.5, scale: fit(0.4, 0.9) };
    return both ? { x: 0.6, y: 0.68, scale: fit(0.3, 0.5) } : { x: 0.78, y: 0.5, scale: fit(0.4, 0.8) };
  }
  const tb = textBox(w, h, safe);
  const textBottom = tb.y + tb.h + 0.01;
  const portrait = shape === "portrait";
  // Photos may bleed into the platform's bottom UI zone; products stay inside the safe area.
  const floor = kind === "product" && safe ? 1 - safe.bottom : 1;
  const availH = floor - textBottom;
  let x = 0.5;
  let s: number;
  if (kind === "photo") {
    s = both ? fit(portrait ? 0.85 : 0.55, availH) : fit(portrait ? 0.9 : 0.6, availH);
    x = both && !portrait ? 0.7 : 0.5;
  } else {
    s = both ? fit(portrait ? 0.6 : 0.42, availH * 0.8) : fit(0.7, availH);
    x = both ? (portrait ? 0.62 : 0.3) : 0.5;
  }
  const bottom = floor - (kind === "product" && both ? 0.02 : 0);
  return { x, y: bottom - hFrac(s) / 2, scale: s };
}

export function resolveComposition(design: Design, w: number, h: number, placementKey: string): Composition {
  const { content, transforms } = design;
  const rule = placementRule(placementKey);
  const key = sizeKey(w, h);
  const hasPhoto = content.layers.photo.visible && !!content.layers.photo.image;
  const hasProduct = content.layers.product.visible && !!content.layers.product.image;
  const layers = {} as Composition["layers"];
  for (const kind of LAYER_KINDS) {
    const st = content.layers[kind];
    const aspect = kind === "background" ? 1 : imageAspect(st.image);
    layers[kind] = { ...st, ...(transforms[key]?.[kind] ?? defaultTransform(kind, w, h, rule.safe, { aspect, hasPhoto, hasProduct })) };
  }
  const t = content.text;
  return {
    order: content.order,
    layers,
    text: { headline: t.headline, headlineScale: t.headlineScale, align: t.align, color: t.color, scrim: t.scrim, cta: t.cta, showCta: t.ctaOverride[placementKey] ?? ctaDefault(placementKey) },
  };
}

/** Returns a copy of the design with one layer's transform overridden for one size. */
export function withTransform(design: Design, w: number, h: number, kind: LayerKind, t: Transform): Design {
  const k = sizeKey(w, h);
  return { ...design, transforms: { ...design.transforms, [k]: { ...design.transforms[k], [kind]: t } } };
}

export function resetSize(design: Design, w: number, h: number, kind?: LayerKind): Design {
  const k = sizeKey(w, h);
  if (!kind) {
    const { [k]: _drop, ...rest } = design.transforms;
    void _drop;
    return { ...design, transforms: rest };
  }
  const { [kind]: _d, ...layerRest } = design.transforms[k] ?? {};
  void _d;
  return { ...design, transforms: { ...design.transforms, [k]: layerRest } };
}
