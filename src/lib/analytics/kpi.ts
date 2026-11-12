import type { AdRecord } from "@/lib/ads/types";
import { derive, type DerivedMetric, type Totals } from "@/lib/metrics/csv";

export interface StageKpi {
  /** Funnel stage as tagged on ads. */
  stage: string;
  metric: DerivedMetric;
  /** What the team calls it, e.g. "CPA (PSU)". */
  label: string;
  direction: "higher" | "lower";
  /** Shown in the UI when the platform data can't yet produce the exact KPI. */
  note?: string;
}

// From the paid team's feedback. Not final: check with channel leads once 2027 strategy is set.
// Conversion types (PSU, MQL, FSU, TSU) aren't in the imported data yet, so CPA stands in for them.
export const STAGE_KPIS: StageKpi[] = [
  { stage: "Brand Awareness", metric: "cpm", label: "CPM", direction: "lower", note: "Video also tracks completion rate." },
  { stage: "Interest", metric: "cpc", label: "CPC", direction: "lower", note: "Display uses FSU instead of CPC." },
  { stage: "Consideration", metric: "cpa", label: "CPA", direction: "lower", note: "PSU for SS, MQL for SCS." },
  { stage: "Intent", metric: "cpa", label: "CPA", direction: "lower", note: "PSU for SS, MQL for SCS." },
  { stage: "B2P", metric: "cpa", label: "CPA (PSU)", direction: "lower" },
  { stage: "P2T", metric: "cpa", label: "CPA (TSU)", direction: "lower" },
  { stage: "T2E", metric: "cpa", label: "CPA (MQL)", direction: "lower" },
];

/** Older ads and the current taxonomy say "Awareness". */
const ALIAS: Record<string, string> = { Awareness: "Brand Awareness" };
const FALLBACK: Omit<StageKpi, "stage"> = { metric: "ctr", label: "CTR", direction: "higher" };

export function kpiForStage(stage: string | undefined): StageKpi {
  const name = stage ? ALIAS[stage] ?? stage : "";
  return STAGE_KPIS.find((k) => k.stage === name) ?? { stage: stage ?? "Untagged", ...FALLBACK };
}

export interface KpiRanked<A = AdRecord> {
  ad: A;
  kpi: StageKpi;
  value: number;
}

/** Ads with enough data, best first by their own stage's KPI. Meaningful when the ads share a stage. */
export function rankByStageKpi<A extends Pick<AdRecord, "tags" | "name">>(ads: A[], totals: Map<string, Totals>, minImpressions: number): KpiRanked<A>[] {
  return ads
    .flatMap((ad) => {
      const t = totals.get(ad.name);
      if (!t || t.impressions < minImpressions) return [];
      const kpi = kpiForStage(ad.tags.funnel);
      const value = derive(t, kpi.metric);
      return value === undefined ? [] : [{ ad, kpi, value }];
    })
    .sort((a, b) => (a.kpi.direction === "lower" ? a.value - b.value : b.value - a.value));
}

/** Formats a KPI value: percentages for CTR/CVR, dollars otherwise. */
export function fmtKpi(metric: DerivedMetric, v: number): string {
  return metric === "ctr" || metric === "cvr" ? `${v.toFixed(2)}%` : `$${v.toFixed(2)}`;
}
