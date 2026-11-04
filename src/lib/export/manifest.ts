import type { AdRecord } from "@/lib/ads/types";

export type Structure = "platform" | "concept" | "flat";
export type Format = "png" | "jpg";

export function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function exportPath(ad: Pick<AdRecord, "name" | "platform" | "conceptKey" | "width" | "height">, structure: Structure, format: Format): string {
  const file = `${ad.name}.${format}`;
  if (structure === "platform") return `${ad.platform}/${ad.width}x${ad.height}/${file}`;
  if (structure === "concept") return `${ad.conceptKey}/${file}`;
  return file;
}

/** Rough compressed size per pixel; only used for the size estimate shown before building. */
const BYTES_PER_PIXEL: Record<Format, number> = { png: 0.35, jpg: 0.1 };

export function estimateBytes(ads: Pick<AdRecord, "width" | "height">[], format: Format, scale: number): number {
  return ads.reduce((n, a) => n + a.width * a.height * scale * scale * BYTES_PER_PIXEL[format], 0);
}

export const MANIFEST_HEADER = ["ad_name", "file_path", "concept", "campaign", "platform", "placement", "width", "height", "status", "launched", "funnel", "persona", "icp", "geo", "offer", "in_image_headline", "intro_text", "platform_headline", "cta", "landing_page"];

export function manifestRows(ads: AdRecord[], structure: Structure, format: Format): unknown[][] {
  return ads.map((a) => [
    a.name, exportPath(a, structure, format), a.conceptKey, a.campaign, a.platform, a.placement, a.width, a.height, a.status, a.launchedAt,
    a.tags.funnel, a.tags.persona.join("; "), (a.tags.icp ?? []).join("; "), (a.tags.geo ?? []).join("; "), a.tags.offer,
    a.copy?.headline, a.copy?.intro, a.copy?.platformHeadline, a.copy?.cta, a.copy?.landing,
  ]);
}
