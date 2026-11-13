// The editable description of an ad template, extracted from its Figma frames.
// One FrameSpec per size. Positions are fractions of the frame (0..1) so they scale; `px` keeps the Figma values.
import type { LogoVariant } from "@/lib/composition/logo";
import type { TemplateIssue } from "@/lib/figma/validate-template";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ElementRole =
  | "headline" | "subhead" | "stat" | "body" | "cta"
  | "logo" | "partner-logos" | "image" | "background-image" | "product"
  | "decoration";

export interface TextInfo {
  /** Characters in the Figma copy. */
  chars: number;
  lines: number;
  font: { family?: string; size: number; weight?: number; lineHeight?: number; letterSpacing?: number; textCase?: string };
  align: "left" | "center" | "right" | "justify";
  color?: string;
  autoResize?: string;
  /** Rough count of characters that fit the box at this size; a hint for the limit, not a guarantee. */
  capacity: number;
  /** Suggested limit for editors. The designer confirms or changes it. */
  maxChars: number;
}

export interface ImageInfo {
  fit: "fill" | "fit" | "crop" | "tile" | "unknown";
  aspect: number;
  coversFrame: boolean;
}

export interface ElementSpec {
  id: string;
  name: string;
  role: ElementRole;
  /** "named" came from a #slot layer name; "inferred" was worked out from the layer's type, size and position. */
  source: "named" | "inferred";
  box: Box;
  px: Box;
  /** Paint order, 0 = furthest back. */
  z: number;
  /** Copy, image or logo can't be changed by editors. */
  locked: boolean;
  text?: TextInfo;
  image?: ImageInfo;
  /** The closest brand mark color to what the Figma instance uses. */
  logo?: { variant: LogoVariant };
  cta?: { label: string; fill?: string; textColor?: string; radius?: number };
  /** For partner-logos: how many logos the grid holds. */
  count?: number;
}

export interface FrameSpec {
  nodeId: string;
  name: string;
  conceptKey: string;
  width: number;
  height: number;
  background: { color?: string; image: boolean };
  elements: ElementSpec[];
  layout: {
    /** Distance from the frame edge to the content, as fractions. */
    margins: { top: number; right: number; bottom: number; left: number };
    /** Vertical gaps between stacked text elements, in px. */
    textGaps: number[];
    autoLayout: boolean;
  };
  /** Placements this size is used for (from the platform specs). */
  placements: string[];
  /** How many small shapes and vectors were treated as decoration. */
  decorationCount: number;
  issues: TemplateIssue[];
}

export interface TemplateSpec {
  version: 1;
  source: { fileKey: string; nodeId?: string };
  frames: FrameSpec[];
  /** Frames sized like ads that couldn't be read (wrong name pattern). */
  unmatched: { nodeId: string; name: string }[];
  /** Per role, the smallest suggested character limit across sizes, so one limit works everywhere. */
  limits: Partial<Record<ElementRole, number>>;
  issues: TemplateIssue[];
}
