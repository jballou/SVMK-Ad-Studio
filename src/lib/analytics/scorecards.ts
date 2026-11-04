import type { AdRecord } from "@/lib/ads/types";
import type { Totals } from "@/lib/metrics/csv";
import { buildScorecard, type Benchmark, type ManualChecks, type Scorecard } from "@/lib/scorecard/build";

/** Scorecards for every launched ad, ranking each against peers on the same platform and funnel. */
export function scoreAll(ads: AdRecord[], totals: Map<string, Totals>, benchmarks: Benchmark[], manual: Record<string, ManualChecks>, today: string): Map<string, Scorecard> {
  const launched = ads.filter((a) => a.status !== "draft");
  const groups = new Map<string, AdRecord[]>();
  for (const a of launched) groups.set(`${a.platform}|${a.tags.funnel}`, [...(groups.get(`${a.platform}|${a.tags.funnel}`) ?? []), a]);
  const out = new Map<string, Scorecard>();
  for (const ad of launched) {
    const peers = (groups.get(`${ad.platform}|${ad.tags.funnel}`) ?? []).filter((p) => p.id !== ad.id).map((p) => ({ ad: p, totals: totals.get(p.name) }));
    out.set(ad.name, buildScorecard({ ad, totals: totals.get(ad.name), benchmarks, manual: manual[ad.name] ?? {}, peers, today }));
  }
  return out;
}
