import type { AdRecord } from "@/lib/ads/types";
import { derive, type Totals } from "@/lib/metrics/csv";
import type { Benchmark } from "@/lib/scorecard/build";

export interface DailyPoint {
  adName: string;
  day: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export const ZERO: Totals = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

export function addTotals(a: Totals, p: Pick<Totals, "spend" | "impressions" | "clicks" | "conversions">): Totals {
  return { spend: a.spend + p.spend, impressions: a.impressions + p.impressions, clicks: a.clicks + p.clicks, conversions: a.conversions + p.conversions };
}

export function sumPoints(points: DailyPoint[]): Totals {
  return points.reduce<Totals>(addTotals, ZERO);
}

export interface Rates {
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cvr?: number;
  cpa?: number;
}

export function rates(t: Totals): Rates {
  return { ctr: derive(t, "ctr"), cpc: derive(t, "cpc"), cpm: derive(t, "cpm"), cvr: derive(t, "cvr"), cpa: derive(t, "cpa") };
}

export function groupBy<T>(items: T[], key: (t: T) => string | string[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    for (const kk of Array.isArray(k) ? k : [k]) m.set(kk, [...(m.get(kk) ?? []), it]);
  }
  return m;
}

/** Points grouped by an ad dimension (platform, persona, funnel, concept...), summed. */
export function totalsByDimension(points: DailyPoint[], adsByName: Map<string, AdRecord>, dim: (a: AdRecord) => string | string[]): Map<string, Totals> {
  const out = new Map<string, Totals>();
  for (const p of points) {
    const ad = adsByName.get(p.adName);
    if (!ad) continue;
    const k = dim(ad);
    for (const kk of Array.isArray(k) ? k : [k]) out.set(kk, addTotals(out.get(kk) ?? ZERO, p));
  }
  return out;
}

export function totalsByAd(points: DailyPoint[]): Map<string, Totals> {
  const out = new Map<string, Totals>();
  for (const p of points) out.set(p.adName, addTotals(out.get(p.adName) ?? ZERO, p));
  return out;
}

/** Sum of a metric per day across the given points, sorted by date. */
export function dailySeries(points: DailyPoint[], value: (t: Totals) => number | undefined): { x: string; y: number }[] {
  const byDay = new Map<string, Totals>();
  for (const p of points) byDay.set(p.day, addTotals(byDay.get(p.day) ?? ZERO, p));
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).flatMap(([x, t]) => {
    const y = value(t);
    return y === undefined ? [] : [{ x, y }];
  });
}

/** Weekly buckets (week starting Monday) for smoother trends. */
export function weeklySeries(points: DailyPoint[], value: (t: Totals) => number | undefined): { x: string; y: number }[] {
  const byWeek = new Map<string, Totals>();
  for (const p of points) {
    const d = new Date(`${p.day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const wk = d.toISOString().slice(0, 10);
    byWeek.set(wk, addTotals(byWeek.get(wk) ?? ZERO, p));
  }
  return [...byWeek].sort(([a], [b]) => a.localeCompare(b)).flatMap(([x, t]) => {
    const y = value(t);
    return y === undefined ? [] : [{ x, y }];
  });
}

export function inRange(points: DailyPoint[], from: string, to: string): DailyPoint[] {
  return points.filter((p) => p.day >= from && p.day <= to);
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** % change of `cur` vs `prev`; undefined when prev is 0/undefined. */
export function pctChange(cur: number | undefined, prev: number | undefined): number | undefined {
  if (cur === undefined || prev === undefined || prev === 0) return undefined;
  return ((cur - prev) / prev) * 100;
}

/** How far an ad's primary metric is past its benchmark (1.0 = at benchmark, >1 better). */
export function performanceIndex(ad: Pick<AdRecord, "platform" | "tags">, t: Totals, benchmarks: Benchmark[]): number | undefined {
  const b = benchmarks.find((x) => x.platform === ad.platform && x.funnel === ad.tags.funnel && x.tier === "primary");
  if (!b) return undefined;
  const v = derive(t, b.metric);
  if (v === undefined || v === 0) return undefined;
  return b.direction === "higher" ? v / b.value : b.value / v;
}

export function distinctValues(ads: AdRecord[], pick: (a: AdRecord) => string[]): string[] {
  return [...new Set(ads.flatMap(pick))].sort();
}
