import type { LogoVariant } from "./logo";

export type LayerKind = "background" | "photo" | "product";
export const LAYER_KINDS: LayerKind[] = ["background", "photo", "product"];
export const LAYER_LABEL: Record<LayerKind, string> = { background: "Background", photo: "Photo", product: "Product" };

export type ImageRef =
  | { source: "gallery"; id: string }
  /** A stored upload or import (Drive, Figma). The bytes live in storage and are served from /api/assets/[id]. */
  | { source: "asset"; id: string; name: string; naturalW: number; naturalH: number; approved: boolean; origin: "upload" | "drive" | "figma" }
  /** Browser-only fallback when image storage isn't connected: `src` exists only in the session that uploaded it. */
  | { source: "upload"; name: string; naturalW: number; naturalH: number; src?: string };

/** Center of the layer as a fraction of the canvas, and its width as a fraction of canvas width. */
export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface LayerState {
  visible: boolean;
  image?: ImageRef;
  /** Background preset id. */
  preset?: string;
}

export type TextColor = "auto" | "dark" | "light";
export type Align = "left" | "center";

export interface TextState {
  headline: string;
  headlineScale: number;
  align: Align;
  color: TextColor;
  scrim: boolean;
  cta: string;
  /** Per placement: overrides the platform default for whether the creative carries its own CTA. */
  ctaOverride: Record<string, boolean>;
}

/** Everything about a concept's creative that is shared across sizes. */
export interface DesignContent {
  /** Bottom to top. */
  order: LayerKind[];
  layers: Record<LayerKind, LayerState>;
  text: TextState;
  /** Brand mark color. Green by default. */
  logo: LogoVariant;
}

export type TransformMap = Record<string, Partial<Record<LayerKind, Transform>>>;

export interface Design {
  content: DesignContent;
  /** Per-size position/size overrides, keyed `WxH`. Anything missing falls back to the default for that shape. */
  transforms: TransformMap;
  /** Which imagery layers this concept's template supports (up to two). */
  supports: { photo: boolean; product: boolean };
}

/** A design resolved for one specific ad size and placement. This is what gets rendered, checked and stored. */
export interface Composition {
  order: LayerKind[];
  layers: Record<LayerKind, LayerState & Transform>;
  logo: LogoVariant;
  text: { headline: string; headlineScale: number; align: Align; color: TextColor; scrim: boolean; cta: string; showCta: boolean };
}

export const sizeKey = (w: number, h: number) => `${w}x${h}`;
