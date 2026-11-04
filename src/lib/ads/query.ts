import type { AdRecord, AdStatus, SortKey } from "./types";

export interface AdFilters {
  q?: string;
  platform?: string;
  status?: AdStatus;
  persona?: string;
  funnel?: string;
}

export function filterAds(ads: AdRecord[], f: AdFilters): AdRecord[] {
  const q = f.q?.trim().toLowerCase();
  return ads.filter(
    (a) =>
      (!q || a.name.toLowerCase().includes(q) || a.conceptKey.toLowerCase().includes(q)) &&
      (!f.platform || a.platform === f.platform) &&
      (!f.status || a.status === f.status) &&
      (!f.persona || a.tags.persona.includes(f.persona)) &&
      (!f.funnel || a.tags.funnel === f.funnel),
  );
}

export function sortAds(ads: AdRecord[], key: SortKey): AdRecord[] {
  const copy = [...ads];
  switch (key) {
    case "launched": // newest first; unlaunched last
      return copy.sort((a, b) => (b.launchedAt ?? "").localeCompare(a.launchedAt ?? "") || a.name.localeCompare(b.name));
    case "platform":
      return copy.sort((a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name));
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/** Pausing records the date; moving back to live clears it. */
export function setStatus(ad: AdRecord, status: AdStatus, today: string): AdRecord {
  return {
    ...ad,
    status,
    pausedAt: status === "paused" ? today : status === "live" ? undefined : ad.pausedAt,
  };
}

export function distinct(ads: AdRecord[], pick: (a: AdRecord) => string[]): string[] {
  return [...new Set(ads.flatMap(pick))].sort();
}
