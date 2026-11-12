// Placement specs are data, not code. `verifiedOn: null` means not yet checked against the
// platform's current docs; do not treat those rows as authoritative.
import type { CustomPlatform } from "./custom";

/** Platforms the app ships with. More can be added in Settings; see custom.ts. */
export const BUILTIN_PLATFORMS = ["meta", "linkedin", "native", "display", "audio", "ctv", "youtube", "newsletter"] as const;
export type BuiltinPlatform = (typeof BUILTIN_PLATFORMS)[number];
/** A built-in key or one added in Settings. */
export type PlatformKey = string;

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
  /** Set on added platforms: whether the creative must carry its own CTA. Built-ins are decided by platform in rules.ts. */
  ctaRequired?: boolean;
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
  // Native, audio, CTV and YouTube were added from the paid team's platform list. Slots and sizes below are
  // placeholders (common industry sizes) until the channel leads confirm what they actually buy.
  {
    key: "native-feed",
    platform: "native",
    label: "Native in-feed",
    sizes: [{ w: 1200, h: 675 }, { w: 800, h: 800 }],
    copyLimits: [{ field: "headline", max: 90 }],
    notes: "Placeholder sizes until the native vendors' specs are confirmed.",
    mockup: "display-page",
    verifiedOn: null,
  },
  {
    key: "audio-companion",
    platform: "audio",
    label: "Audio companion banner",
    sizes: [{ w: 640, h: 640 }],
    notes: "The spot itself is audio; this is the banner shown while it plays.",
    mockup: "display-page",
    verifiedOn: null,
  },
  {
    key: "ctv-spot",
    platform: "ctv",
    label: "CTV end card",
    sizes: [{ w: 1920, h: 1080 }],
    notes: "Placeholder: the end card for a 15s or 30s CTV spot.",
    mockup: "display-page",
    verifiedOn: null,
  },
  {
    key: "youtube-video",
    platform: "youtube",
    label: "YouTube video",
    sizes: [{ w: 1920, h: 1080 }, { w: 1280, h: 720 }],
    notes: "Placeholder: in-stream end frames. Sizes avoid the Meta and LinkedIn ones so size lookups stay unambiguous.",
    mockup: "display-page",
    verifiedOn: null,
  },
];

// ---- Registry: built-ins plus platforms added in Settings ----
// Server pages call hydratePlatforms (lib/db/platforms.ts) before rendering; client components get the same list from
// <PlatformRegistry> (components/ui/platform-registry.tsx), which sets it during render. The list is global, not per user.
let custom: CustomPlatform[] = [];
export function setCustomPlatforms(list: CustomPlatform[]) { custom = list; }
export const customPlatforms = () => custom;

export const platformKeys = (): PlatformKey[] => [...BUILTIN_PLATFORMS, ...custom.map((c) => c.key)];
export const isBuiltin = (k: string) => (BUILTIN_PLATFORMS as readonly string[]).includes(k);

const BUILTIN_LABEL: Record<BuiltinPlatform, string> = { linkedin: "LinkedIn", meta: "Meta", native: "Native", display: "Display", audio: "Audio", ctv: "CTV", youtube: "YouTube", newsletter: "Newsletter" };
const BUILTIN_COLOR: Record<BuiltinPlatform, string> = {
  linkedin: "#5568BF", meta: "#43A6AF", display: "#D07A2F", newsletter: "#99A532", native: "#7068EB", audio: "#08794A", ctv: "#AE453F", youtube: "#6F5BB5",
};
export function platformLabel(k: PlatformKey): string {
  return custom.find((c) => c.key === k)?.label ?? BUILTIN_LABEL[k as BuiltinPlatform] ?? k;
}
export function platformColor(k: PlatformKey): string {
  return custom.find((c) => c.key === k)?.color ?? BUILTIN_COLOR[k as BuiltinPlatform] ?? "#8A8A85";
}

/** Every placement, built-in and added. */
export function allPlacements(): Placement[] {
  return [
    ...PLACEMENTS,
    ...custom.flatMap((c) => c.placements.map((p): Placement => ({
      key: p.key, platform: c.key, label: p.label, sizes: p.sizes, mockup: "display-page", ctaRequired: c.ctaRequired,
      notes: "Added in Settings. Sizes are as entered; not checked against the platform.", verifiedOn: null,
    }))),
  ];
}

export function placementsFor(platform: PlatformKey): Placement[] {
  return allPlacements().filter((p) => p.platform === platform);
}
