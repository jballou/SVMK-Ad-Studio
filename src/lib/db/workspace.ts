import "server-only";
import { getDb } from "@/db";
import { groupBy } from "@/lib/analytics/aggregate";
import type { DailyPoint } from "@/lib/analytics/aggregate";
import type { AdRecord } from "@/lib/ads/types";
import { dummyDataOn } from "@/lib/dummy-mode";
import { getBenchmarks, getDailyMetrics, getGate, getTaxonomy, listAds } from "./repo";

/** Everything the analytics screens need, loaded once per request. */
export async function loadWorkspace() {
  const db = await getDb();
  const [allAds, allDaily, benchmarks, gate, taxonomy, dummy] = await Promise.all([listAds(db), getDailyMetrics(db), getBenchmarks(db), getGate(db), getTaxonomy(db), dummyDataOn()]);
  // With the Dummy data switch off, only real ads (and their numbers) are loaded.
  const ads = dummy ? allAds : allAds.filter((a) => !a.isSample);
  const names = new Set(ads.map((a) => a.name));
  const daily = dummy ? allDaily : allDaily.filter((p) => names.has(p.adName));
  const adsByName = new Map<string, AdRecord>(ads.map((a) => [a.name, a]));
  const pointsByAd = groupBy<DailyPoint>(daily, (p) => p.adName);
  const today = new Date().toLocaleDateString("en-CA");
  // Reports are anchored to the newest data so windows ("last 30 days") are never empty.
  const asOf = daily.reduce((m, p) => (p.day > m ? p.day : m), "0000-00-00");
  return { db, dummy, ads, adsByName, daily, pointsByAd, benchmarks, gate, taxonomy, today, asOf };
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;
