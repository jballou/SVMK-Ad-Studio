// Parses a copy-deck tab (2D array of cell strings, header row first) into normalized rows.
// Tabs vary in layout, so columns are auto-mapped from header text and the mapping can be overridden.
export type DeckField =
  | "adName" | "funnel" | "brief" | "platform" | "inAssetCopy" | "pmmMessaging"
  | "headline" | "intro" | "offerHeadline" | "landingPage" | "adLink" | "cta";

const SYNONYMS: Record<DeckField, RegExp> = {
  adName: /^ad name$/i,
  funnel: /^funnel/i,
  brief: /^brief$/i,
  platform: /^platform$/i,
  inAssetCopy: /in[- ]asset copy/i,
  pmmMessaging: /messaging ideas/i,
  headline: /^headline$/i,
  intro: /^introductory text|^body copy|^intro text/i,
  offerHeadline: /^offer headline/i,
  landingPage: /^landing page|^url$/i,
  adLink: /^ad link$/i,
  cta: /^cta$|^call to action/i,
};

export type ColumnMap = Partial<Record<DeckField, number>>;

const isNumeric = (s: string) => s.trim() !== "" && /^\d+(\.\d+)?$/.test(s.trim());

/** Header text -> column index. Duplicate headers (e.g. a count column repeating its field's name) resolve to the text-bearing column. */
export function autoMapColumns(values: string[][]): ColumnMap {
  const [header = [], ...body] = values;
  const map: ColumnMap = {};
  for (const field of Object.keys(SYNONYMS) as DeckField[]) {
    const candidates = header.flatMap((h, i) => (SYNONYMS[field].test(h.trim()) ? [i] : []));
    const best = candidates.find((i) => body.some((r) => (r[i] ?? "").trim() !== "" && !isNumeric(r[i]!)));
    if (best !== undefined) map[field] = best;
  }
  return map;
}

export interface DeckRow {
  rowNumber: number; // 1-based sheet row
  adName: string;
  fields: Partial<Record<Exclude<DeckField, "adName">, string>>;
}

export function parseDeck(values: string[][], map: ColumnMap = autoMapColumns(values)): DeckRow[] {
  if (map.adName === undefined) throw new Error("No 'Ad Name' column found; supply a column map");
  const rows: DeckRow[] = [];
  values.slice(1).forEach((r, idx) => {
    const adName = (r[map.adName!] ?? "").trim();
    if (!adName) return; // spacer / note rows (e.g. unnamed rewrite rows) are skipped
    const fields: DeckRow["fields"] = {};
    for (const [f, col] of Object.entries(map) as [DeckField, number][]) {
      if (f === "adName") continue;
      const v = (r[col] ?? "").trim();
      if (v) fields[f] = v;
    }
    rows.push({ rowNumber: idx + 2, adName, fields });
  });
  return rows;
}

/** `YourBrand072025` -> concept key + launch month. Keys may start with digits (`80Enterprise072025`). */
export function parseAdBase(adName: string): { conceptKey: string; month: number; year: number } | null {
  const m = /^([A-Za-z0-9]*?[A-Za-z])(\d{2})(\d{4})$/.exec(adName.trim());
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return { conceptKey: m[1], month: Number(m[2]), year: Number(m[3]) };
}

/** Splits "LI Static Ad Copy: ... Display Ad Copy: ..." into labeled variants; plain text returns {default}. */
export function splitInAssetCopy(text: string): Record<string, string> {
  const re = /^([A-Z][A-Za-z ]*(?:Copy|Alt)):\s*$/gm;
  const marks = [...text.matchAll(re)];
  if (marks.length === 0) return text.trim() ? { default: text.trim() } : {};
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = marks[i + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (body) out[m[1]] = body;
  });
  return out;
}
