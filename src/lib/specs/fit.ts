import type { Placement } from "./platforms";

export type Fit =
  | { status: "ok" }
  | { status: "cropped"; to: number; note: string }
  | { status: "unsupported"; note: string };

/** How a creative of w x h behaves in a placement, based on the placement's accepted ratio range. */
export function checkFit(w: number, h: number, p: Placement): Fit {
  if (!p.ratioRange) return { status: "ok" };
  const r = w / h;
  const { min, max } = p.ratioRange;
  const eps = 0.01;
  if (r >= min - eps && r <= max + eps) return { status: "ok" };
  if (r < min && p.cropTo) return { status: "cropped", to: p.cropTo, note: `Taller than ${min}; platform crops to ${p.cropTo}` };
  return { status: "unsupported", note: `Ratio ${r.toFixed(2)} outside ${min}–${max}` };
}

/** Placements a creative of this size can run in without being rejected. */
export function placementsFitting(w: number, h: number, all: Placement[]): { placement: Placement; fit: Fit }[] {
  return all.map((placement) => ({ placement, fit: checkFit(w, h, placement) })).filter((x) => x.fit.status !== "unsupported");
}
