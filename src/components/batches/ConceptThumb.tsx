"use client";

import { useState } from "react";
import { AdArt } from "@/components/ads/AdArt";
import { conceptImage, type ConceptSeed } from "@/lib/dummy/concepts";
import { artFor } from "@/lib/dummy/library";

/** A concept's real Figma export when one exists, otherwise the generated placeholder art. */
export function ConceptThumb({ concept }: { concept: ConceptSeed }) {
  const src = conceptImage(concept.key);
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={concept.headline} loading="lazy" onError={() => setFailed(true)} className="block aspect-square w-full object-cover" />;
  }
  return <AdArt art={artFor(concept)} copy={concept} width={1200} height={1200} showCta={false} />;
}
