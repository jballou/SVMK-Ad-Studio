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
  /** Accepted width/height range. Outside it the platform crops or rejects. */
  ratioRange?: { min: number; max: number };
  /** Ratio the platform crops over-tall/over-wide assets to. */
  cropTo?: number;
  notes?: string;
  sourceUrl?: string;
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
  // Meta rows below other than Threads come from third-party guides that disagree with each
  // other; Meta's own Ads Guide pages were not reachable. Verify before treating as authoritative.
  {
    key: "facebook-feed",
    platform: "meta",
    label: "Facebook feed",
    sizes: [{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }],
    ratioRange: { min: 0.8, max: 1.91 },
    mockup: "facebook-feed",
    verifiedOn: null,
  },
  {
    key: "instagram-feed",
    platform: "meta",
    label: "Instagram feed",
    sizes: [{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }],
    ratioRange: { min: 0.8, max: 1.91 },
    notes: "Profile grid crops feed posts to 3:4; keep key content centered.",
    mockup: "instagram-feed",
    verifiedOn: null,
  },
  {
    key: "meta-stories-reels",
    platform: "meta",
    label: "Facebook / Instagram Stories & Reels (9:16)",
    sizes: [{ w: 1080, h: 1920 }],
    ratioRange: { min: 0.5625, max: 0.5625 },
    // Sources disagree (older ~14% top / ~18% bottom; a 2026 report says 14% / 35%). Using the stricter pair.
    safeZone: { top: 0.14, bottom: 0.35 },
    mockup: "meta-stories",
    verifiedOn: null,
  },
  {
    key: "facebook-link-landscape",
    platform: "meta",
    label: "Facebook right column / link (1.91:1)",
    sizes: [{ w: 1200, h: 628 }],
    ratioRange: { min: 1.0, max: 1.91 },
    mockup: "facebook-feed",
    verifiedOn: null,
  },
  {
    key: "threads-feed",
    platform: "meta",
    label: "Threads feed",
    sizes: [{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }, { w: 1200, h: 628 }],
    ratioRange: { min: 0.8, max: 1.91 },
    cropTo: 0.8,
    notes: "Taller than 4:5 is cropped and vertically centered to 4:5. Static carousels are 1:1 only.",
    sourceUrl: "https://developers.facebook.com/blog/post/2025/10/28/new-formats-and-optimization-for-ads-in-threads",
    mockup: "threads-feed",
    verifiedOn: "2026-11-03",
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
    sizes: [{ w: 600, h: 200 }, { w: 600, h: 300 }],
    notes: "Placeholder sizes until the vendors' slot specs are confirmed.",
    mockup: "newsletter",
    verifiedOn: null,
  },
];

export function placementsFor(platform: PlatformKey): Placement[] {
  return PLACEMENTS.filter((p) => p.platform === platform);
}
