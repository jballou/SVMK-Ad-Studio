// Platforms added from Settings after handoff ("add a vendor"). Built-in platforms live in platforms.ts;
// these extend them at runtime with the same shape, so nothing else needs a code change.
export interface CustomPlacement {
  key: string;
  label: string;
  sizes: { w: number; h: number }[];
}

export interface CustomPlatform {
  key: string;
  label: string;
  /** Hex color for charts and badges. */
  color: string;
  /** True when the platform shows no CTA button of its own, so the creative must carry one. */
  ctaRequired: boolean;
  placements: CustomPlacement[];
}

/** Colors offered in the form (brand palette, see globals.css). */
export const PLATFORM_PALETTE = ["#5568BF", "#43A6AF", "#D07A2F", "#99A532", "#7068EB", "#08794A", "#AE453F", "#6F5BB5"];

export const MIN_SIDE = 50;
export const MAX_SIDE = 4000;
export const MAX_SIZES_PER_PLACEMENT = 8;

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** "1200x628, 600 × 500" -> sizes. Throws a readable error on anything else. */
export function parseSizes(text: string): { w: number; h: number }[] {
  const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Add at least one size, like 1200x628.");
  if (parts.length > MAX_SIZES_PER_PLACEMENT) throw new Error(`At most ${MAX_SIZES_PER_PLACEMENT} sizes per placement.`);
  const seen = new Set<string>();
  return parts.map((p) => {
    const m = /^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i.exec(p);
    if (!m) throw new Error(`"${p}" isn't a size. Use width x height, like 1200x628.`);
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w < MIN_SIDE || h < MIN_SIDE || w > MAX_SIDE || h > MAX_SIDE) throw new Error(`${w}x${h} is outside ${MIN_SIDE}–${MAX_SIDE} pixels.`);
    if (seen.has(`${w}x${h}`)) throw new Error(`${w}x${h} is listed twice.`);
    seen.add(`${w}x${h}`);
    return { w, h };
  });
}

/** One placement per line: `Label: 1200x628, 600x500`. A line with no colon uses the platform name as its label. */
export function parsePlacementLines(text: string, platformLabel: string, platformKey: string): CustomPlacement[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("Add at least one placement with its sizes.");
  const keys = new Set<string>();
  return lines.map((line) => {
    const i = line.indexOf(":");
    const label = (i < 0 ? platformLabel : line.slice(0, i)).trim();
    if (!label || label.length > 60) throw new Error("Each placement needs a name of 1–60 characters.");
    const key = `${platformKey}-${slugify(label) === platformKey ? "default" : slugify(label)}`.slice(0, 60);
    if (keys.has(key)) throw new Error(`"${label}" is listed twice.`);
    keys.add(key);
    return { key, label, sizes: parseSizes(i < 0 ? line : line.slice(i + 1)) };
  });
}

export interface PlatformDraft {
  label: string;
  color: string;
  ctaRequired: boolean;
  /** Placement lines, see parsePlacementLines. */
  placements: string;
}

/**
 * Turns the form into a platform, or says what's wrong. `takenKeys` are the keys already in use (built-in and custom);
 * `existingSizes` maps "WxH" to the placement that already uses it, so overlaps can be flagged.
 */
export function buildPlatform(draft: PlatformDraft, takenKeys: string[], existingSizes: Map<string, string> = new Map()): { ok: true; platform: CustomPlatform; warnings: string[] } | { ok: false; error: string } {
  try {
    const label = draft.label.trim();
    if (label.length < 2 || label.length > 30) throw new Error("The name needs 2–30 characters.");
    const key = slugify(label).slice(0, 24);
    if (key.length < 2) throw new Error("The name needs letters or numbers.");
    if (takenKeys.includes(key)) throw new Error(`There is already a platform called "${label}".`);
    if (!PLATFORM_PALETTE.includes(draft.color)) throw new Error("Pick one of the listed colors.");
    const placements = parsePlacementLines(draft.placements, label, key);
    const warnings: string[] = [];
    for (const p of placements) {
      for (const s of p.sizes) {
        const clash = existingSizes.get(`${s.w}x${s.h}`);
        if (clash) warnings.push(`${s.w}x${s.h} is also used by ${clash}. Template checks can't tell the two apart by size alone.`);
      }
    }
    return { ok: true, platform: { key, label, color: draft.color, ctaRequired: draft.ctaRequired, placements }, warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That platform isn't valid." };
  }
}

/** Defensive read of stored settings: drops anything malformed rather than crashing every page. */
export function cleanStored(value: unknown): CustomPlatform[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const p = v as Partial<CustomPlatform>;
    if (typeof p.key !== "string" || typeof p.label !== "string" || typeof p.color !== "string" || !Array.isArray(p.placements)) return [];
    const placements = p.placements.filter((x): x is CustomPlacement => !!x && typeof x.key === "string" && typeof x.label === "string" && Array.isArray(x.sizes) && x.sizes.every((s) => Number.isFinite(s?.w) && Number.isFinite(s?.h)));
    return placements.length ? [{ key: p.key, label: p.label, color: p.color, ctaRequired: p.ctaRequired !== false, placements }] : [];
  });
}
