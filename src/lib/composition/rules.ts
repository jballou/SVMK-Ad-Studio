import { PLACEMENTS } from "@/lib/specs/platforms";
import type { Safe } from "./geometry";

export interface PlacementRule {
  /** The platform's own UI adds a CTA button, so the image should not carry one. */
  uiAddsCta: boolean;
  /** The creative is the whole ad, so it must carry its own CTA. */
  ctaRequired: boolean;
  safe?: Safe;
  platform: string;
}

export function placementRule(placementKey: string): PlacementRule {
  const p = PLACEMENTS.find((x) => x.key === placementKey);
  const platform = p?.platform ?? "display";
  const uiAddsCta = platform === "linkedin" || platform === "meta";
  return { uiAddsCta, ctaRequired: !uiAddsCta, safe: p?.safeZone, platform };
}

/** Whether the image carries a CTA unless the designer has overridden it. */
export const ctaDefault = (placementKey: string) => placementRule(placementKey).ctaRequired;
