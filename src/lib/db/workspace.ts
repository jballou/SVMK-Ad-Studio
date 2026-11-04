import "server-only";
import { getDb } from "@/db";
import { groupBy } from "@/lib/analytics/aggregate";
import type { DailyPoint } from "@/lib/analytics/aggregate";
import type { AdRecord } from "@/lib/ads/types";
import { getBenchmarks, getDailyMetrics, listAds } from "./repo";

/** Everything the analytics screens need, loaded once per request. */
export async function loadWorkspace() {
  const db = await getDb();
  const [ads, daily, benchmarks] = await Promise.all([listAds(db), getDailyMetrics(db), getBenchmarks(db)]);
  const adsByName = new Map<string, AdRecord>(ads.map((a) => [a.name, a]));
  const pointsByAd = groupBy<DailyPoint>(daily, (p) => p.adName);
  const today = new Date().toLocaleDateString("en-CA");
  // Reports are anchored to the newest data so windows ("last 30 days") are never empty.
  const asOf = daily.reduce((m, p) => (p.day > m ? p.day : m), "0000-00-00");
  return { db, ads, adsByName, daily, pointsByAd, benchmarks, today, asOf };
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;
