import { adName } from "@/lib/figma/parse-frame-name";
import { PLACEMENTS, type Placement } from "@/lib/specs/platforms";

export interface PlanAd {
  name: string;
  conceptKey: string;
  placement: string;
  platform: Placement["platform"];
  width: number;
  height: number;
  exists: boolean;
}

/** concept x placement x size. `existing` is the set of ad names already in the library (those are skipped). */
export function planBatch(input: { conceptKeys: string[]; placementKeys: string[]; month: number; year: number; existing: Set<string> }): PlanAd[] {
  const placements = input.placementKeys.map((k) => PLACEMENTS.find((p) => p.key === k)).filter((p): p is Placement => !!p);
  const out: PlanAd[] = [];
  const seen = new Set<string>();
  for (const conceptKey of input.conceptKeys) {
    for (const p of placements) {
      for (const s of p.sizes) {
        const name = adName(conceptKey, { month: input.month, year: input.year }, s.w, s.h);
        // The same size can appear in several placements (e.g. two Meta feeds); one file serves both.
        if (seen.has(name)) continue;
        seen.add(name);
        out.push({ name, conceptKey, placement: p.key, platform: p.platform, width: s.w, height: s.h, exists: input.existing.has(name) });
      }
    }
  }
  return out;
}

export interface CopyRowCheck {
  field: string;
  severity: "error" | "warn";
  message: string;
}

export function checkCopy(row: { platformHeadline: string; intro: string; cta: string; headline: string }, limits: { platformHeadline: number; intro: number }): CopyRowCheck[] {
  const out: CopyRowCheck[] = [];
  if (!row.headline) out.push({ field: "headline", severity: "error", message: "Missing in-image headline" });
  if (!row.platformHeadline) out.push({ field: "platformHeadline", severity: "error", message: "Missing headline" });
  else if (row.platformHeadline.length > limits.platformHeadline) out.push({ field: "platformHeadline", severity: "error", message: `Headline ${row.platformHeadline.length}/${limits.platformHeadline} characters` });
  if (row.intro.length > limits.intro) out.push({ field: "intro", severity: "error", message: `Intro ${row.intro.length}/${limits.intro} characters` });
  else if (row.intro.length > limits.intro - 8) out.push({ field: "intro", severity: "warn", message: `Intro ${row.intro.length}/${limits.intro} (near limit)` });
  if (!row.cta) out.push({ field: "cta", severity: "warn", message: "Missing CTA" });
  return out;
}
