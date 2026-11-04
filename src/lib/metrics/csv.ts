// Platform export -> per-ad daily metrics. Ads are matched on the `{ConceptKey}{MMYYYY}_{W}x{H}` ad name.
export interface MetricRow {
  adName: string;
  day: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface CsvImport {
  rows: MetricRow[];
  errors: { line: number; message: string }[];
  unmatchedNames: string[];
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) out.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) out.push(row);
  return out;
}

const HEADERS: Record<keyof MetricRow, RegExp> = {
  adName: /^(ad[ _]?name|ad|creative[ _]?name|name)$/i,
  day: /^(date|day|reporting starts)$/i,
  spend: /^(spend|cost|amount spent.*|total spent)$/i,
  impressions: /^impressions$/i,
  clicks: /^(clicks|link clicks|clicks \(all\))$/i,
  conversions: /^(conversions|leads|results|total conversions)$/i,
};

const num = (s: string | undefined) => {
  const n = Number((s ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

function toIso(s: string): string | null {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

export function importMetrics(text: string, knownNames: string[] = []): CsvImport {
  const [header = [], ...body] = parseCsv(text);
  const idx = {} as Record<keyof MetricRow, number>;
  const errors: CsvImport["errors"] = [];
  for (const k of Object.keys(HEADERS) as (keyof MetricRow)[]) {
    idx[k] = header.findIndex((h) => HEADERS[k].test(h.trim()));
  }
  for (const req of ["adName", "day", "impressions"] as const) {
    if (idx[req] < 0) errors.push({ line: 1, message: `Missing required column: ${req}` });
  }
  if (errors.length) return { rows: [], errors, unmatchedNames: [] };

  const rows: MetricRow[] = [];
  body.forEach((r, i) => {
    const line = i + 2;
    const day = toIso(r[idx.day] ?? "");
    const impressions = num(r[idx.impressions]);
    if (!day) return void errors.push({ line, message: `Unrecognized date "${r[idx.day]}"` });
    if (Number.isNaN(impressions)) return void errors.push({ line, message: "Impressions is not a number" });
    const opt = (k: keyof MetricRow) => (idx[k] >= 0 ? num(r[idx[k]]) || 0 : 0);
    rows.push({ adName: (r[idx.adName] ?? "").trim(), day, spend: opt("spend"), impressions, clicks: opt("clicks"), conversions: opt("conversions") });
  });
  const known = new Set(knownNames);
  const unmatchedNames = knownNames.length ? [...new Set(rows.map((r) => r.adName).filter((n) => !known.has(n)))] : [];
  return { rows, errors, unmatchedNames };
}

export interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export function totalsByAd(rows: MetricRow[]): Record<string, Totals> {
  const out: Record<string, Totals> = {};
  for (const r of rows) {
    const t = (out[r.adName] ??= { spend: 0, impressions: 0, clicks: 0, conversions: 0 });
    t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.conversions += r.conversions;
  }
  return out;
}

export type DerivedMetric = "ctr" | "cpc" | "cpm" | "cvr" | "cpa";

/** CTR and CVR are percentages; the others are currency. Undefined when the denominator is zero. */
export function derive(t: Totals, m: DerivedMetric): number | undefined {
  switch (m) {
    case "ctr": return t.impressions ? (t.clicks / t.impressions) * 100 : undefined;
    case "cpc": return t.clicks ? t.spend / t.clicks : undefined;
    case "cpm": return t.impressions ? (t.spend / t.impressions) * 1000 : undefined;
    case "cvr": return t.clicks ? (t.conversions / t.clicks) * 100 : undefined;
    case "cpa": return t.conversions ? t.spend / t.conversions : undefined;
  }
}
