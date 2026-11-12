"use client";

import { setCustomPlatforms } from "@/lib/specs/platforms";
import type { CustomPlatform } from "@/lib/specs/custom";

/**
 * Gives client components the platforms added in Settings. Render it before them on any server page that has one.
 * Setting the list during render is intentional: it's idempotent and has to happen before the children read it.
 */
export function PlatformRegistry({ platforms }: { platforms: CustomPlatform[] }) {
  setCustomPlatforms(platforms);
  return null;
}
