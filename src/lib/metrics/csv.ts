// Platform export -> per-ad daily metrics. Ads are matched on the `{ConceptKey}{MMYYYY}_{W}x{H}` ad name.
export interface MetricRow {
  adName: string;
  /** The platform's own ad/creative ID when the export has one (more stable than names). */
  externalId?: string;
  day: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** Video metrics are optional; absent columns stay null (not zero). */
  videoStarts?: number;
  videoCompletions?: number;
}

/** What an export says about one platform ad overall (not per day), used to create or match the ad. */
export interface SourceAd {
  /** The platform's ID when the export has one, otherwise the name. */
  key: string;
  name: string;
  externalId?: string;
  adSet?: string;
  campaign?: string;
  objective?: string;
  /** e.g. "Sponsored Update" or "Sponsored Messaging". */
  kind?: string;
  /** The platform's current status for the ad, as exported ("Active", "Paused"). */
  status?: string;
  /** First and last day with any impressions in the file. */
  firstDay?: string;
  lastDay?: string;
  impressions: number;
}

export interface CsvImport {
  rows: MetricRow[];
  /** One entry per platform ad in the file. */
  ads: SourceAd[];
  headers: string[];
  errors: { line: number; message: string }[];
  unmatchedNames: string[];
}

/** Platform exports are sometimes UTF-16 (LinkedIn) rather than UTF-8; read the byte-order mark. */
export function decodeExport(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b);
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b);
  return new TextDecoder("utf-8").decode(b);
}

/** Tab-separated exports are common; pick the delimiter that splits the first lines most. */
export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 25).join("\n");
  const count = (d: string) => head.split(d).length;
  return count("\t") > count(",") ? "\t" : ",";
}

export function parseCsv(text: string, delimiter = ","): string[][] {
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
    else if (c === delimiter) { row.push(cell); cell = ""; }
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
  externalId: /^(creative|ad)[ _]?id$/i,
  day: /^(date|day|reporting starts|start date( \(in utc\))?)$/i,
  spend: /^(spend|cost|amount spent.*|total spent)$/i,
  impressions: /^impressions$/i,
  clicks: /^(clicks|link clicks|clicks \(all\))$/i,
  conversions: /^(conversions|results|total conversions)$/i,
  videoStarts: /^video[ _]?(starts|views)$/i,
  videoCompletions: /^video[ _]?(completions|completed views|completes)$/i,
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

const LEADS = /^(leads|lead form leads)$/i;
const META = {
  adSet: /^ad set name$/i,
  campaign: /^campaign name$/i,
  objective: /^ad set objective$/i,
  kind: /^ad set type$/i,
  status: /^ad status$/i,
} as const;

export function importMetrics(text: string, knownNames: string[] = []): CsvImport {
  const all = parseCsv(text, detectDelimiter(text));
  // Exports often start with report-title lines; the header is the first row that names an ad, a date and impressions.
  const isHeader = (r: string[]) => r.some((h) => HEADERS.impressions.test(h.trim())) && r.some((h) => HEADERS.day.test(h.trim())) && r.some((h) => HEADERS.adName.test(h.trim()));
  const at = all.slice(0, 30).findIndex(isHeader);
  const headerAt = at < 0 ? 0 : at;
  const [header = [], ...body] = all.slice(headerAt);
  const idx = {} as Record<keyof MetricRow, number>;
  const errors: CsvImport["errors"] = [];
  for (const k of Object.keys(HEADERS) as (keyof MetricRow)[]) {
    idx[k] = header.findIndex((h) => HEADERS[k].test(h.trim()));
  }
  if (idx.conversions < 0) idx.conversions = header.findIndex((h) => LEADS.test(h.trim()));
  for (const req of ["adName", "day", "impressions"] as const) {
    if (idx[req] < 0) errors.push({ line: 1, message: `Missing required column: ${req}` });
  }
  if (errors.length) return { rows: [], ads: [], headers: header, errors, unmatchedNames: [] };

  const mi = Object.fromEntries(Object.entries(META).map(([k, re]) => [k, header.findIndex((h) => re.test(h.trim()))])) as Record<keyof typeof META, number>;
  const cell = (r: string[], k: keyof typeof META) => (mi[k] >= 0 ? (r[mi[k]] ?? "").trim() || undefined : undefined);
  const ads = new Map<string, SourceAd & { setWeight: Map<string, number>; lastSeen: string }>();
  const rows: MetricRow[] = [];
  body.forEach((r, i) => {
    const line = headerAt + i + 2;
    // A row with neither a name nor an ID is a totals or spacer row. With only an ID (a Message ad with no name), use the ID.
    const rawName = (r[idx.adName] ?? "").trim();
    const rawId = idx.externalId >= 0 ? (r[idx.externalId] ?? "").trim() : "";
    if (!rawName && !rawId) return;
    const day = toIso(r[idx.day] ?? "");
    const impressions = num(r[idx.impressions]);
    if (!day) return void errors.push({ line, message: `Unrecognized date "${r[idx.day]}"` });
    if (Number.isNaN(impressions)) return void errors.push({ line, message: "Impressions is not a number" });
    const opt = (k: keyof MetricRow) => (idx[k] >= 0 ? num(r[idx[k]]) || 0 : 0);
    const row: MetricRow = { adName: rawName || rawId, day, spend: opt("spend"), impressions, clicks: opt("clicks"), conversions: opt("conversions") };
    const ext = idx.externalId >= 0 ? (r[idx.externalId] ?? "").trim() : "";
    if (ext) row.externalId = ext;
    if (idx.videoStarts >= 0) row.videoStarts = opt("videoStarts");
    if (idx.videoCompletions >= 0) row.videoCompletions = opt("videoCompletions");
    rows.push(row);

    const key = ext || row.adName;
    let a = ads.get(key);
    if (!a) { a = { key, name: row.adName, externalId: ext || undefined, impressions: 0, setWeight: new Map(), lastSeen: "" }; ads.set(key, a); }
    a.impressions += impressions;
    a.campaign ??= cell(r, "campaign");
    a.objective ??= cell(r, "objective");
    a.kind ??= cell(r, "kind");
    const set = cell(r, "adSet");
    if (set) a.setWeight.set(set, (a.setWeight.get(set) ?? 0) + impressions);
    if (impressions > 0) {
      if (!a.firstDay || day < a.firstDay) a.firstDay = day;
      if (!a.lastDay || day > a.lastDay) a.lastDay = day;
    }
    if (day >= a.lastSeen) { a.lastSeen = day; a.status = cell(r, "status") ?? a.status; }
  });
  const sourceAds: SourceAd[] = [...ads.values()].map(({ setWeight, lastSeen, ...a }) => {
    void lastSeen;
    // An ad can run in several ad sets; describe it by the one that delivered the most.
    const adSet = [...setWeight].sort((x, y) => y[1] - x[1])[0]?.[0];
    return { ...a, adSet };
  });
  const known = new Set(knownNames);
  const unmatchedNames = knownNames.length ? [...new Set(rows.map((r) => r.adName).filter((n) => !known.has(n)))] : [];
  return { rows, ads: sourceAds, headers: header, errors, unmatchedNames };
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
