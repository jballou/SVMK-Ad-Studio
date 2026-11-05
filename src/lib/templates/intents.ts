import type { AdArtSpec } from "@/lib/ads/types";

/**
 * Templates are named for creative intent (what the ad is trying to do), not for a campaign.
 * A campaign/concept (e.g. `117TheAnthem`) supplies the copy and imagery and still names the ad.
 * `layout` and `supports` drive today's renderer; they are replaced by the template editor's document later.
 */
export interface StarterTemplate {
  slug: string;
  name: string;
  description: string;
  layout: AdArtSpec["layout"];
  supports: { photo: boolean; product: boolean };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { slug: "lifestyle-impact", name: "Lifestyle impact", description: "A people-first photo that shows the outcome, with a short emotional headline.", layout: "center", supports: { photo: true, product: false } },
  { slug: "product-feature-spotlight", name: "Product feature spotlight", description: "One feature or capability, shown large, with a clear benefit headline.", layout: "left", supports: { photo: false, product: true } },
  { slug: "product-in-use", name: "Product in use", description: "The product on screen inside a real context, with a person or workspace behind it.", layout: "bottom", supports: { photo: true, product: true } },
  { slug: "stat-proof-point", name: "Stat / proof point", description: "A single number or result leads, with the claim and source below.", layout: "left", supports: { photo: false, product: false } },
  { slug: "customer-quote", name: "Customer quote", description: "A short testimonial with the customer's name, role and logo.", layout: "center", supports: { photo: true, product: false } },
  { slug: "offer-promo", name: "Offer / promo", description: "A time-bound offer or trial, with the deal and the CTA prominent.", layout: "center", supports: { photo: false, product: false } },
  { slug: "report-download", name: "Report / download", description: "A gated asset (report, guide) shown as a cover with a download CTA.", layout: "left", supports: { photo: false, product: true } },
  { slug: "event-webinar", name: "Event / webinar", description: "Date, speakers and topic for a live or on-demand session.", layout: "bottom", supports: { photo: true, product: false } },
];

export const templateBySlug = (slug: string) => STARTER_TEMPLATES.find((t) => t.slug === slug);

// Each concept's layout picks a family of intents; its index in the concept list picks one.
// Interim link until concepts store a template of their own.
const INTENTS_BY_LAYOUT: Record<AdArtSpec["layout"], string[]> = {
  left: ["product-feature-spotlight", "stat-proof-point", "report-download"],
  center: ["lifestyle-impact", "customer-quote", "offer-promo"],
  bottom: ["product-in-use", "event-webinar"],
};

export function intentSlugFor(layout: AdArtSpec["layout"], index: number): string {
  const options = INTENTS_BY_LAYOUT[layout];
  return options[index % options.length];
}
