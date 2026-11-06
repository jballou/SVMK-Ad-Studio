import type { AdRecord } from "@/lib/ads/types";
import { AdArt } from "./AdArt";
import { DisplayPage } from "@/components/mockups/DisplayPage";
import { LinkedInFeed } from "@/components/mockups/LinkedInFeed";
import { MetaPost } from "@/components/mockups/MetaPost";
import { MetaStory } from "@/components/mockups/MetaStory";
import { NewsletterSlot } from "@/components/mockups/NewsletterSlot";

/** The ad shown inside its platform UI. `placement` can override the ad's own (e.g. to preview a creative in Threads). */
export function PlacementPreview({ ad, placement = ad.placement, showSafeZone = true }: { ad: Pick<AdRecord, "art" | "copy" | "width" | "height" | "placement" | "composition" | "imageUrl">; placement?: string; showSafeZone?: boolean }) {
  const { width, height } = ad;
  const copy = ad.copy;
  const art = <AdArt art={ad.art} copy={copy} width={width} height={height} composition={ad.composition} placementKey={placement} imageUrl={ad.imageUrl} />;
  const intro = copy?.intro ?? "";
  const headline = copy?.platformHeadline ?? copy?.headline ?? "";
  const cta = copy?.cta;
  switch (placement) {
    case "linkedin-single-image":
      return <LinkedInFeed intro={intro} headline={headline} cta={cta} width={width} height={height} media={art} />;
    case "facebook-feed":
    case "facebook-link-landscape":
      return <MetaPost variant="facebook" primaryText={intro} headline={headline} cta={cta} width={width} height={height} media={art} />;
    case "instagram-feed":
      return <MetaPost variant="instagram" primaryText={intro} cta={cta} width={width} height={height} media={art} />;
    case "threads-feed":
      return <MetaPost variant="threads" primaryText={intro} width={width} height={height} media={art} />;
    case "meta-stories-reels":
      return <MetaStory media={art} cta={cta} showSafeZone={showSafeZone} />;
    case "newsletter":
      return <NewsletterSlot media={art} width={width} />;
    default:
      return <DisplayPage media={art} width={width} height={height} />;
  }
}
