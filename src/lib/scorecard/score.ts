// Scoring mirrors the Q3 2026 scorecard deck: 8 criteria, 45 pts max; criteria without a
// benchmark are null and drop out of the denominator.
export type Criterion =
  | "campaignActive"
  | "landingPageClear"
  | "ctaMatch"
  | "icpMatch"
  | "underNinetyDays"
  | "primaryMetrics"
  | "secondaryMetrics"
  | "topPerformer";

export const MAX_POINTS: Record<Criterion, number> = {
  campaignActive: 5,
  landingPageClear: 5,
  ctaMatch: 5,
  icpMatch: 5,
  underNinetyDays: 5,
  primaryMetrics: 10,
  secondaryMetrics: 5,
  topPerformer: 5,
};

/** true = earns full points, false = 0, null = not applicable (excluded from the denominator). */
export type CriterionResult = boolean | null;

export type Band = "keep-scale" | "monitor-optimize" | "optimize-test" | "refresh-pause";

export const BAND_LABEL: Record<Band, string> = {
  "keep-scale": "Keep / Scale",
  "monitor-optimize": "Monitor / Optimize",
  "optimize-test": "Optimize / Test",
  "refresh-pause": "Refresh / Pause",
};

export interface Score {
  earned: number;
  possible: number;
  percent: number;
  band: Band;
}

export function bandFor(percent: number): Band {
  if (percent >= 90) return "keep-scale";
  if (percent >= 70) return "monitor-optimize";
  if (percent >= 50) return "optimize-test";
  return "refresh-pause";
}

export function scoreCard(results: Record<Criterion, CriterionResult>): Score {
  let earned = 0;
  let possible = 0;
  for (const c of Object.keys(MAX_POINTS) as Criterion[]) {
    const r = results[c];
    if (r === null) continue;
    possible += MAX_POINTS[c];
    if (r) earned += MAX_POINTS[c];
  }
  const percent = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  return { earned, possible, percent, band: bandFor(percent) };
}

export interface LearningGate {
  minDays: number;
  minImpressions: number;
}

export const DEFAULT_GATE: LearningGate = { minDays: 14, minImpressions: 10_000 };

/** An ad in the learning phase is "too early": no band or score is shown. */
export function isTooEarly(daysLive: number, impressions: number, gate: LearningGate = DEFAULT_GATE): boolean {
  return daysLive < gate.minDays || impressions < gate.minImpressions;
}
