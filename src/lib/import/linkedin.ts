// Reads what a LinkedIn Campaign Manager export says about an ad from its name and its ad set, so a new ad can be
// created with its format, size, launch month, stage and geo filled in instead of asking someone to type them.
import { DEFAULT_TAXONOMY } from "@/lib/settings";

export interface ParsedAdName {
  /** The format word from the name: Carousel, Video, In-Feed, static... */
  format: string;
  /** Ad Studio's ad type (Static | Carousel | Video). */
  adType: string;
  /** Concept words from the name without the month, e.g. "333WoomWanted". */
  conceptKey: string;
  /** MMYYYY from the name when it has one. */
  month?: string;
  width?: number;
  height?: number;
}

const MONTH_SUFFIX = /(0[1-9]|1[0-2])(20\d\d)$/;
const SIZE = /(\d{3,4})\s*x\s*(\d{3,4})/i;

const ADTYPE: [RegExp, string][] = [
  [/^carousel$/i, "Carousel"],
  [/^video$/i, "Video"],
  [/^(in-?feed|static|image|single|single-?image|photo)$/i, "Static"],
];

/** `LI_Carousel_333WoomWanted012026_Design_Static_1080x1080_Feb_V1` -> format, concept, month, size. Null when it isn't in that shape. */
export function parseLinkedInAdName(name: string): ParsedAdName | null {
  const parts = name.trim().split("_");
  if (parts.length < 3 || parts[0].toUpperCase() !== "LI") return null;
  const format = parts[1];
  let concept = parts[2].trim();
  if (!concept) return null;
  let month: string | undefined;
  const m = MONTH_SUFFIX.exec(concept);
  if (m && concept.length > 6) { month = m[0]; concept = concept.slice(0, -6); }
  const size = SIZE.exec(parts.slice(3).join("_"));
  return {
    format,
    adType: ADTYPE.find(([re]) => re.test(format))?.[1] ?? "Static",
    conceptKey: concept,
    month,
    width: size ? Number(size[1]) : undefined,
    height: size ? Number(size[2]) : undefined,
  };
}

export type Stage = "Awareness" | "Interest" | "Conversion" | "Re-engage";

export interface ParsedAdSet {
  stage?: Stage;
  /** One of the taxonomy funnels when the ad set names it (Consideration and Intent are kinds of Conversion stage). */
  funnel?: string;
  geo?: string;
  personas: string[];
}

const OBJECTIVE_STAGE: Record<string, Stage> = { "brand awareness": "Awareness", "website visits": "Interest", "website conversions": "Conversion" };

/** `SVMK_LI_Evergreen_US_EN_Core_Marketing_Interest_RT_In-Feed_` -> stage, geo, persona. Falls back to the objective, then the campaign name. */
export function parseAdSet(adSetName: string | undefined, objective?: string, campaignName?: string): ParsedAdSet {
  const name = (adSetName ?? "").toLowerCase();
  const tokens = (adSetName ?? "").split("_").map((t) => t.trim());
  let stage: Stage | undefined;
  let funnel: string | undefined;
  const from = (s: string): [Stage | undefined, string | undefined] => {
    if (/re-?engage|remarketing/.test(s)) return ["Re-engage", undefined];
    if (/brand awareness|awareness/.test(s)) return ["Awareness", "Awareness"];
    if (/consideration/.test(s)) return ["Conversion", "Consideration"];
    if (/intent/.test(s)) return ["Conversion", "Intent"];
    if (/conversion/.test(s)) return ["Conversion", undefined];
    if (/interest/.test(s)) return ["Interest", "Interest"];
    return [undefined, undefined];
  };
  [stage, funnel] = from(name);
  if (!stage && objective) stage = OBJECTIVE_STAGE[objective.trim().toLowerCase()];
  if (!stage && campaignName) [stage, funnel] = from(campaignName.toLowerCase());
  const geo = tokens.find((t) => DEFAULT_TAXONOMY.geos.includes(t.toUpperCase()))?.toUpperCase();
  const personas = DEFAULT_TAXONOMY.personas.filter((p) => tokens.some((t) => t.toLowerCase() === p.toLowerCase()));
  return { stage, funnel, geo, personas };
}

/** Which platform an export came from, judged by its column names. Null when it can't tell. */
export function detectPlatform(headers: string[]): string | null {
  const has = (re: RegExp) => headers.some((h) => re.test(h.trim()));
  if (has(/^ad set objective$/i) && (has(/^sponsored update type$/i) || has(/lead forms? opened/i) || has(/^ad set type$/i))) return "linkedin";
  return null;
}

/** Ad Studio names are `{Concept}{MMYYYY}_{W}x{H}`; this reads one the same way so it can be compared with a LinkedIn name. */
export function parseStudioName(name: string): { conceptKey: string; month: string; width: number; height: number } | null {
  const m = /^(.+?)(\d{6})_(\d{2,5})x(\d{2,5})$/.exec(name);
  return m ? { conceptKey: m[1], month: m[2], width: Number(m[3]), height: Number(m[4]) } : null;
}
