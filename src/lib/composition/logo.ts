import { worstContrast } from "./color";

/** Brand mark colors from the palette: Green 500, white, and Green 900. */
export type LogoVariant = "green" | "white" | "green-900";
export const LOGO_VARIANTS: LogoVariant[] = ["green", "white", "green-900"];

export const LOGO_COLOR: Record<LogoVariant, string> = { green: "#089B5E", white: "#FFFFFF", "green-900": "#0F2E21" };

export const LOGO_INFO: Record<LogoVariant, { label: string; use: string }> = {
  green: { label: "Green", use: "Default. Use whenever it reads clearly on the background." },
  white: { label: "White", use: "Optional. For dark backgrounds where green doesn't have enough contrast." },
  "green-900": { label: "Green 900", use: "Use sparingly, only where the standard green clashes." },
};

/** The brand mark may be resized, but only within this range of the template default. */
export const LOGO_SCALE_MIN = 0.8;
export const LOGO_SCALE_MAX = 1.25;
export const clampLogoScale = (s: number) => Math.round(Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, s)) * 100) / 100;

/** Graphics need 3:1 against their background (WCAG non-text contrast). */
export const LOGO_MIN_CONTRAST = 3;

export function logoContrast(v: LogoVariant, bgs: string[]): number {
  return worstContrast(LOGO_COLOR[v], bgs);
}

/** Green unless it fails contrast; then white or Green 900, whichever reads better. */
export function recommendedLogo(bgs: string[]): LogoVariant {
  if (logoContrast("green", bgs) >= LOGO_MIN_CONTRAST) return "green";
  return logoContrast("white", bgs) >= logoContrast("green-900", bgs) ? "white" : "green-900";
}

/** More than a quarter of a batch (and at least two concepts) on Green 900 is no longer "sparing". */
export function overusesGreen900(counts: Record<LogoVariant, number>): boolean {
  const total = counts.green + counts.white + counts["green-900"];
  return counts["green-900"] >= 2 && counts["green-900"] > total * 0.25;
}
