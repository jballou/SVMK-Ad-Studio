import type { AdArtSpec, AdCopy } from "@/lib/ads/types";
import { AdArt } from "./AdArt";

/** A creative scaled to fit a fixed box, so rows stay even whatever the ad's shape. */
export function AdThumb({ ad, w = 64, h = 48, className = "" }: { ad: { art?: AdArtSpec; copy?: AdCopy; width: number; height: number }; w?: number; h?: number; className?: string }) {
  const ratio = ad.width / ad.height;
  const width = ratio >= w / h ? w : Math.round(h * ratio);
  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`} style={{ width: w, height: h }}>
      <span className="block overflow-hidden rounded border border-brand-neutral-200" style={{ width }}>
        <AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={false} />
      </span>
    </span>
  );
}
