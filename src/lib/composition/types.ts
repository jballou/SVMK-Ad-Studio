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
  /** Photo only: the photo is meant to fill the whole ad edge to edge. */
  bleed?: boolean;
  /** Photo only: how to fill any part of the ad the photo doesn't cover. "blur" paints a soft, enlarged copy of the photo behind it. */
  extend?: "none" | "blur";
}

export type TextColor = "auto" | "dark" | "light";
export type Align = "left" | "center" | "right";

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
  /** Brand mark size relative to the template default; limited to LOGO_SCALE_MIN..MAX. Defaults to 1. */
  logoScale?: number;
}

export type TransformMap = Record<string, Partial<Record<LayerKind, Transform>>>;

export interface Design {
  content: DesignContent;
  /** Per-size position/size overrides, keyed `WxH`. Anything missing falls back to the default for that shape. */
  transforms: TransformMap;
  /** Per-size headline offset from its template position, as fractions of the canvas. */
  textOffsets?: Record<string, { dx: number; dy: number }>;
  /** Which imagery layers this concept's template supports (up to two). */
  supports: { photo: boolean; product: boolean };
}

/** A design resolved for one specific ad size and placement. This is what gets rendered, checked and stored. */
export interface Composition {
  order: LayerKind[];
  layers: Record<LayerKind, LayerState & Transform>;
  logo: LogoVariant;
  logoScale?: number;
  text: { headline: string; headlineScale: number; align: Align; color: TextColor; scrim: boolean; cta: string; showCta: boolean; dx?: number; dy?: number };
}

export const sizeKey = (w: number, h: number) => `${w}x${h}`;
