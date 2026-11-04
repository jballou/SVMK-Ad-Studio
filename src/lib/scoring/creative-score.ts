// Creative Score: the 0–200 index model from the ad program's "Creative Performance Scoring Model".
// Each KPI becomes an index against the benchmark for its own Platform x Ad type x Funnel stage
// (100 = at benchmark, CPM inverted, capped), the indices are weighted by stage and format family,
// and KPIs with no benchmark or no data are dropped and the weights re-normalized.

export type FunnelStage = "Awareness" | "Interest" | "Conversion" | "Re-engage";
export type Family = "Static" | "Video";
export type KpiKey = "cpm" | "vtr" | "completion" | "ctr" | "convRate" | "convPer1k";
export type Tier = "Scale" | "Outperforming" | "On benchmark" | "Iterate" | "Pause";
export type DataStatus = "verified" | "placeholder" | "no-delivery";

export const KPI_KEYS: KpiKey[] = ["cpm", "vtr", "completion", "ctr", "convRate", "convPer1k"];

/** Summed raw numbers for one creative in one funnel stage (sum across ad sets, then derive). */
export interface RawInputs {
  impressions: number;
  spend: number;
  clicks: number;
  videoStarts?: number | null;
  videoCompletions?: number | null;
  conversions: number;
}

export type Kpis = Record<KpiKey, number | null>;

/** Benchmark KPI values; null/undefined = does not apply to this format or stage. Rates are fractions (0.011 = 1.1%). */
export interface Benchmark {
  platform: string;
  adType: string;
  stage: FunnelStage;
  /** null = applies to all geos. */
  geo: string | null;
  kpis: Partial<Record<KpiKey, number | null>>;
  status: DataStatus;
  sampleAds?: number;
  source?: string;
}

export interface ScoreConfig {
  minImpressions: number;
  indexCap: number;
  familyByAdType: Record<string, Family>;
  weights: Record<string, Partial<Record<KpiKey, number>>>;
}

export const weightKey = (stage: FunnelStage, family: Family) => `${stage}|${family}`;

export const DEFAULT_CONFIG: ScoreConfig = {
  minImpressions: 10_000,
  indexCap: 200,
  familyByAdType: {
    Static: "Static", Carousel: "Static", Display: "Static", Native: "Static", InMail: "Static",
    // Video family assumed from the sheet's usage; confirm on its Config tab.
    Video: "Video", CTV: "Video", Bumper: "Video", "Non-skippable": "Video",
  },
  weights: {
    "Awareness|Static": { cpm: 50, ctr: 30, convRate: 20 },
    "Awareness|Video": { cpm: 35, vtr: 25, completion: 20, ctr: 12, convRate: 8 },
    "Interest|Static": { ctr: 65, convRate: 35 },
    "Interest|Video": { vtr: 35, completion: 25, ctr: 25, convRate: 15 },
    // ASSUMPTION: the sheet says Conversion and Re-engage use "conversions, then conversion rate";
    // its exact weights were truncated in the export. Confirm and edit in settings.
    "Conversion|Static": { convPer1k: 60, convRate: 40 },
    "Conversion|Video": { convPer1k: 60, convRate: 40 },
    "Re-engage|Static": { convPer1k: 60, convRate: 40 },
    "Re-engage|Video": { convPer1k: 60, convRate: 40 },
  },
};

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function deriveKpis(r: RawInputs): Kpis {
  const cpm = r.impressions > 0 ? (r.spend / r.impressions) * 1000 : null;
  const starts = r.videoStarts ?? null;
  const completions = r.videoCompletions ?? null;
  return {
    cpm,
    vtr: starts == null ? null : div(starts, r.impressions),
    completion: starts == null || completions == null ? null : div(completions, starts),
    ctr: div(r.clicks, r.impressions),
    convRate: div(r.conversions, r.clicks),
    convPer1k: r.impressions > 0 ? (r.conversions / r.impressions) * 1000 : null,
  };
}

export function sumInputs(rows: RawInputs[]): RawInputs {
  const opt = (pick: (r: RawInputs) => number | null | undefined) => {
    const vals = rows.map(pick).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  return {
    impressions: rows.reduce((a, r) => a + r.impressions, 0),
    spend: rows.reduce((a, r) => a + r.spend, 0),
    clicks: rows.reduce((a, r) => a + r.clicks, 0),
    conversions: rows.reduce((a, r) => a + r.conversions, 0),
    videoStarts: opt((r) => r.videoStarts),
    videoCompletions: opt((r) => r.videoCompletions),
  };
}

/** 100 = at benchmark. CPM is inverted (cheaper scores higher). Capped at `cap`, floored at 0. */
export function indexFor(kpi: KpiKey, actual: number, benchmark: number, cap: number): number {
  if (!(benchmark > 0)) return NaN;
  if (kpi === "cpm") return actual <= 0 ? cap : Math.min(cap, (benchmark / actual) * 100);
  return Math.max(0, Math.min(cap, (actual / benchmark) * 100));
}

export function tierFor(score: number): Tier {
  if (score >= 120) return "Scale";
  if (score >= 105) return "Outperforming";
  if (score >= 90) return "On benchmark";
  if (score >= 75) return "Iterate";
  return "Pause";
}

const SOCIAL = new Set(["linkedin", "meta"]);

export function actionFor(tier: Tier, platform: string): string {
  switch (tier) {
    case "Scale":
      // Paid social can't weight budget per creative, so the action is about reach and variants.
      return SOCIAL.has(platform.toLowerCase())
        ? "Duplicate into more ad sets; make this the new control and build variants"
        : "Increase budget share; build new variants off this creative";
    case "Outperforming": return "Keep live; shift some budget or test a variant to push further";
    case "On benchmark": return "Keep live; monitor weekly for decay";
    case "Iterate": return "Refresh hook / format; test a variant before renewing";
    case "Pause": return "Pause or replace; do not renew as-is";
  }
}

/** Exact geo first, then the all-geos row. Returns which one matched. */
export function findBenchmark(
  benchmarks: Benchmark[],
  q: { platform: string; adType: string; stage: FunnelStage; geo?: string | null },
): { benchmark: Benchmark; match: "exact" | "all-geos" } | null {
  const rows = benchmarks.filter((b) => b.platform === q.platform && b.adType === q.adType && b.stage === q.stage);
  const exact = q.geo ? rows.find((b) => b.geo === q.geo) : undefined;
  if (exact) return { benchmark: exact, match: "exact" };
  const all = rows.find((b) => b.geo == null);
  return all ? { benchmark: all, match: "all-geos" } : null;
}

export interface ScoreInput {
  platform: string;
  adType: string;
  stage: FunnelStage;
  geo?: string | null;
  raw: RawInputs;
}

export type ScoreResult =
  | { status: "insufficient"; impressions: number; minImpressions: number }
  | { status: "no-benchmark" }
  | { status: "unknown-ad-type" }
  | {
      status: "scored";
      score: number;
      tier: Tier;
      action: string;
      family: Family;
      kpis: Kpis;
      indices: Partial<Record<KpiKey, number>>;
      /** KPIs that had a weight but were left out (no benchmark or no data). */
      dropped: KpiKey[];
      benchmarkStatus: DataStatus;
      geoMatch: "exact" | "all-geos";
    };

export function scoreCreative(input: ScoreInput, benchmarks: Benchmark[], config: ScoreConfig = DEFAULT_CONFIG): ScoreResult {
  if (input.raw.impressions < config.minImpressions) {
    return { status: "insufficient", impressions: input.raw.impressions, minImpressions: config.minImpressions };
  }
  const family = config.familyByAdType[input.adType];
  if (!family) return { status: "unknown-ad-type" };
  const found = findBenchmark(benchmarks, input);
  if (!found) return { status: "no-benchmark" };

  const weights = config.weights[weightKey(input.stage, family)] ?? {};
  const kpis = deriveKpis(input.raw);
  const indices: Partial<Record<KpiKey, number>> = {};
  const dropped: KpiKey[] = [];
  let weighted = 0;
  let used = 0;
  for (const k of KPI_KEYS) {
    const w = weights[k];
    if (!w) continue;
    const bench = found.benchmark.kpis[k];
    const actual = kpis[k];
    const idx = bench != null && actual != null ? indexFor(k, actual, bench, config.indexCap) : NaN;
    if (Number.isNaN(idx)) { dropped.push(k); continue; }
    indices[k] = idx;
    weighted += w * idx;
    used += w;
  }
  if (used === 0) return { status: "no-benchmark" };
  const score = Math.round(weighted / used);
  const tier = tierFor(score);
  return {
    status: "scored", score, tier, action: actionFor(tier, input.platform), family, kpis, indices, dropped,
    benchmarkStatus: found.benchmark.status, geoMatch: found.match,
  };
}
