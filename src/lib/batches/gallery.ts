import { CONCEPTS, conceptIntent, type ConceptSeed } from "@/lib/dummy/concepts";
import { STARTER_TEMPLATES } from "@/lib/templates/intents";

export interface GalleryItem {
  concept: ConceptSeed;
  /** Creative-intent template slug and its display name. */
  intent: string;
  intentName: string;
}

export interface GalleryFilter {
  query?: string;
  intent?: string | null;
  funnel?: string | null;
  persona?: string | null;
}

/** Ready-to-use concepts (drafts excluded), each tagged with its creative intent. */
export function galleryItems(): GalleryItem[] {
  return CONCEPTS.filter((c) => !c.draft).flatMap((concept) => {
    const intent = conceptIntent(concept.key);
    const name = STARTER_TEMPLATES.find((t) => t.slug === intent)?.name;
    return intent && name ? [{ concept, intent, intentName: name }] : [];
  });
}

/** Free-text search over key, campaign, copy, persona, offer and intent, plus exact-match tag filters. */
export function filterGallery(items: GalleryItem[], f: GalleryFilter): GalleryItem[] {
  const terms = (f.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(({ concept: c, intent, intentName }) => {
    if (f.intent && intent !== f.intent) return false;
    if (f.funnel && c.funnel !== f.funnel) return false;
    if (f.persona && !c.personas.includes(f.persona)) return false;
    if (!terms.length) return true;
    const hay = [c.key, c.campaign, c.headline, c.platformHeadline, c.intro, c.offer, intentName, c.funnel, ...c.personas, ...c.icp].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export const intentCounts = (items: GalleryItem[]) => {
  const out = new Map<string, number>();
  for (const i of items) out.set(i.intent, (out.get(i.intent) ?? 0) + 1);
  return out;
};
