export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1..21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const INK = "#242423";
export const PAPER = "#FFFFFF";

/** Worst-case contrast of `text` against every color a background can show. */
export function worstContrast(text: string, bgs: string[]): number {
  return bgs.length ? Math.min(...bgs.map((b) => contrast(text, b))) : 21;
}

export function autoTextColor(bgs: string[]): string {
  return worstContrast(INK, bgs) >= worstContrast(PAPER, bgs) ? INK : PAPER;
}
