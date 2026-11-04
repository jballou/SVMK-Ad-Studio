import type { AdRecord } from "@/lib/ads/types";
import { addTotals, sumPoints, ZERO, type DailyPoint } from "./aggregate";
import { derive, type Totals } from "@/lib/metrics/csv";

export type FatigueLevel = "fatigued" | "approaching" | "healthy";

export interface FatigueResult {
  ad: AdRecord;
  level: FatigueLevel;
  peakCtr: number;
  currentCtr: number;
  declinePct: number; // positive = CTR is down from its peak
  daysLive: number;
  series: { x: string; y: number }[]; // 7-day rolling CTR
}

export const FATIGUE_THRESHOLDS = { approaching: 20, fatigued: 35, minDays: 14 };

/** 7-day rolling CTR (%) per day, starting once 7 days of data exist. */
export function rollingCtr(points: DailyPoint[], window = 7): { x: string; y: number }[] {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day));
  const out: { x: string; y: number }[] = [];
  for (let i = window - 1; i < sorted.length; i++) {
    const t = sumPoints(sorted.slice(i - window + 1, i + 1));
    const y = derive(t, "ctr");
    if (y !== undefined) out.push({ x: sorted[i].day, y });
  }
  return out;
}

export function assessFatigue(ad: AdRecord, points: DailyPoint[], today: string): FatigueResult | undefined {
  if (points.length < FATIGUE_THRESHOLDS.minDays) return undefined;
  const series = rollingCtr(points);
  if (series.length < 2) return undefined;
  const peak = Math.max(...series.map((s) => s.y));
  const current = series[series.length - 1].y;
  const declinePct = peak > 0 ? ((peak - current) / peak) * 100 : 0;
  const level: FatigueLevel = declinePct >= FATIGUE_THRESHOLDS.fatigued ? "fatigued" : declinePct >= FATIGUE_THRESHOLDS.approaching ? "approaching" : "healthy";
  const launched = ad.launchedAt ?? points[0].day;
  const daysLive = Math.max(0, Math.round((Date.parse(today) - Date.parse(launched)) / 86_400_000));
  return { ad, level, peakCtr: peak, currentCtr: current, declinePct, daysLive, series };
}

/** Live ads that are fatigued or approaching it, worst first. */
export function fatigueReport(ads: AdRecord[], pointsByAd: Map<string, DailyPoint[]>, today: string): FatigueResult[] {
  return ads
    .filter((a) => a.status === "live")
    .flatMap((a) => {
      const r = assessFatigue(a, pointsByAd.get(a.name) ?? [], today);
      return r && r.level !== "healthy" ? [r] : [];
    })
    .sort((a, b) => b.declinePct - a.declinePct);
}

export { ZERO, addTotals };
export type { Totals };
