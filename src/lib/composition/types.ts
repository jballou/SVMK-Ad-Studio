export type LayerKind = "background" | "photo" | "product";
export const LAYER_KINDS: LayerKind[] = ["background", "photo", "product"];
export const LAYER_LABEL: Record<LayerKind, string> = { background: "Background", photo: "Photo", product: "Product" };

export type ImageRef =
  | { source: "gallery"; id: string }
  /** `src` only exists in the browser session that uploaded it; saved designs keep just the metadata. */
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
  text: { headline: string; headlineScale: number; align: Align; color: TextColor; scrim: boolean; cta: string; showCta: boolean };
}

export const sizeKey = (w: number, h: number) => `${w}x${h}`;
