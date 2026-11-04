import type { Totals } from "@/lib/metrics/csv";

export interface AbResult {
  ctrA: number;
  ctrB: number;
  /** Relative lift of B over A, in %. */
  lift: number;
  /** Two-sided p-value for a two-proportion z-test on CTR. */
  pValue: number;
  significant: boolean;
  winner: "A" | "B" | "none";
  /** True when neither ad has enough volume to call. */
  underpowered: boolean;
}

// Abramowitz-Stegun approximation of the standard normal CDF.
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export const MIN_IMPRESSIONS = 5000;

export function compareCtr(a: Totals, b: Totals, alpha = 0.05): AbResult {
  const ctrA = a.impressions ? a.clicks / a.impressions : 0;
  const ctrB = b.impressions ? b.clicks / b.impressions : 0;
  const underpowered = a.impressions < MIN_IMPRESSIONS || b.impressions < MIN_IMPRESSIONS;
  const pooled = (a.clicks + b.clicks) / Math.max(1, a.impressions + b.impressions);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(1, a.impressions) + 1 / Math.max(1, b.impressions)));
  const z = se === 0 ? 0 : (ctrB - ctrA) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = !underpowered && pValue < alpha;
  return {
    ctrA: ctrA * 100, ctrB: ctrB * 100,
    lift: ctrA === 0 ? 0 : ((ctrB - ctrA) / ctrA) * 100,
    pValue, significant, underpowered,
    winner: significant ? (ctrB > ctrA ? "B" : "A") : "none",
  };
}
