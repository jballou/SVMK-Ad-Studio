import { derive, type DerivedMetric, type Totals } from "@/lib/metrics/csv";
import type { AdRecord } from "@/lib/ads/types";
import { DEFAULT_GATE, isTooEarly, scoreCard, type Criterion, type CriterionResult, type LearningGate, type Score } from "./score";

export interface Benchmark {
  platform: string;
  funnel: string;
  metric: DerivedMetric;
  value: number;
  direction: "higher" | "lower";
  tier: "primary" | "secondary";
  source?: string;
}

export type ManualCriterion = "campaignActive" | "landingPageClear" | "ctaMatch" | "icpMatch";
export type ManualChecks = Partial<Record<ManualCriterion, boolean>>;

const beats = (actual: number, b: Benchmark) => (b.direction === "higher" ? actual >= b.value : actual <= b.value);

/** How far past the benchmark (>1 = better), direction-aware. Used to rank peers. */
function strength(actual: number, b: Benchmark) {
  return b.direction === "higher" ? actual / b.value : b.value / actual;
}

/**
 * Assumption (confirm with the team): a tier passes only if every benchmark in it is met.
 * null = no benchmarks for that tier (or no data), which drops the criterion from the score.
 */
export function evaluateTier(t: Totals, ad: Pick<AdRecord, "platform" | "tags">, benchmarks: Benchmark[], tier: Benchmark["tier"]): CriterionResult {
  const bs = benchmarks.filter((b) => b.platform === ad.platform && b.funnel === ad.tags.funnel && b.tier === tier);
  if (bs.length === 0) return null;
  const results = bs.map((b) => {
    const v = derive(t, b.metric);
    return v === undefined ? null : beats(v, b);
  });
  if (results.some((r) => r === null)) return null;
  return results.every(Boolean);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000));
}

export function daysLive(ad: AdRecord, today: string): number {
  if (!ad.launchedAt) return 0;
  return daysBetween(ad.launchedAt, ad.status !== "live" && ad.pausedAt ? ad.pausedAt : today);
}

export interface ScorecardInput {
  ad: AdRecord;
  totals?: Totals;
  benchmarks: Benchmark[];
  manual: ManualChecks;
  /** Other ads in the same platform + funnel, for the top-performer criterion. */
  peers: { ad: AdRecord; totals?: Totals }[];
  today: string;
  gate?: LearningGate;
}

export type Scorecard =
  | { state: "too-early"; daysLive: number; impressions: number; gate: LearningGate }
  | { state: "scored"; score: Score; criteria: Record<Criterion, CriterionResult> };

function primaryStrength(ad: AdRecord, t: Totals | undefined, benchmarks: Benchmark[]): number | undefined {
  const b = benchmarks.find((x) => x.platform === ad.platform && x.funnel === ad.tags.funnel && x.tier === "primary");
  if (!b || !t) return undefined;
  const v = derive(t, b.metric);
  return v === undefined ? undefined : strength(v, b);
}

export function buildScorecard(input: ScorecardInput): Scorecard {
  const { ad, totals, benchmarks, manual, peers, today } = input;
  const gate = input.gate ?? DEFAULT_GATE;
  const days = daysLive(ad, today);
  const impressions = totals?.impressions ?? 0;
  if (isTooEarly(days, impressions, gate)) return { state: "too-early", daysLive: days, impressions, gate };

  const t = totals ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
  const mine = primaryStrength(ad, t, benchmarks);
  const eligible = peers.filter((p) => !isTooEarly(daysLive(p.ad, today), p.totals?.impressions ?? 0, gate));
  const strengths = [ad, ...eligible.map((p) => p.ad)].length > 1 && mine !== undefined
    ? eligible.map((p) => primaryStrength(p.ad, p.totals, benchmarks)).filter((s): s is number => s !== undefined)
    : [];
  const topPerformer: CriterionResult = mine === undefined || strengths.length === 0 ? null : mine >= Math.max(...strengths);

  const criteria: Record<Criterion, CriterionResult> = {
    campaignActive: manual.campaignActive ?? false,
    landingPageClear: manual.landingPageClear ?? false,
    ctaMatch: manual.ctaMatch ?? false,
    icpMatch: manual.icpMatch ?? false,
    underNinetyDays: days < 90,
    primaryMetrics: evaluateTier(t, ad, benchmarks, "primary"),
    secondaryMetrics: evaluateTier(t, ad, benchmarks, "secondary"),
    topPerformer,
  };
  return { state: "scored", score: scoreCard(criteria), criteria };
}
