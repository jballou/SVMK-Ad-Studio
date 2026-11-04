// Placement specs are data, not code. `verifiedOn: null` means not yet checked against the
// platform's current docs; do not treat those rows as authoritative.
export type PlatformKey = "linkedin" | "meta" | "display" | "newsletter";

export interface CopyLimit {
  field: string;
  max: number;
}

export interface Placement {
  key: string;
  platform: PlatformKey;
  label: string;
  sizes: { w: number; h: number }[];
  /** Fraction of height reserved for platform UI at top/bottom (e.g. Stories). */
  safeZone?: { top: number; bottom: number };
  copyLimits?: CopyLimit[];
  mockup: string;
  verifiedOn: string | null;
}

export const PLACEMENTS: Placement[] = [
  {
    key: "linkedin-single-image",
    platform: "linkedin",
    label: "LinkedIn single image",
    sizes: [{ w: 1200, h: 1200 }, { w: 1200, h: 628 }, { w: 720, h: 900 }],
    copyLimits: [{ field: "headline", max: 70 }, { field: "intro", max: 150 }],
    mockup: "linkedin-feed",
    verifiedOn: null,
  },
  {
    key: "meta-feed",
    platform: "meta",
    label: "Facebook / Instagram feed",
    sizes: [{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }],
    mockup: "meta-feed",
    verifiedOn: null,
  },
  {
    key: "meta-stories-reels",
    platform: "meta",
    label: "Stories / Reels (9:16)",
    sizes: [{ w: 1080, h: 1920 }],
    safeZone: { top: 0.14, bottom: 0.2 },
    mockup: "meta-stories",
    verifiedOn: null,
  },
  {
    key: "meta-link-landscape",
    platform: "meta",
    label: "Facebook right column / link (1.91:1)",
    sizes: [{ w: 1200, h: 628 }],
    mockup: "meta-link",
    verifiedOn: null,
  },
  {
    key: "display-standard",
    platform: "display",
    label: "Google Display (standard sizes)",
    sizes: [
      { w: 300, h: 250 }, { w: 336, h: 280 }, { w: 728, h: 90 }, { w: 300, h: 600 },
      { w: 320, h: 50 }, { w: 320, h: 100 }, { w: 160, h: 600 }, { w: 970, h: 250 },
    ],
    mockup: "display-page",
    verifiedOn: null,
  },
  {
    // Slot specs come from the newsletter vendors; to be filled in.
    key: "newsletter",
    platform: "newsletter",
    label: "Newsletter placement",
    sizes: [],
    mockup: "newsletter",
    verifiedOn: null,
  },
];

export function placementsFor(platform: PlatformKey): Placement[] {
  return PLACEMENTS.filter((p) => p.platform === platform);
}
