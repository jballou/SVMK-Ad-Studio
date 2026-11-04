"use client";

import { useState } from "react";
import { PlacementPreview } from "@/components/ads/PlacementPreview";
import type { AdRecord } from "@/lib/ads/types";
import { checkFit } from "@/lib/specs/fit";
import { PLACEMENTS } from "@/lib/specs/platforms";

/** Shows the creative in its platform UI; Meta creatives can be previewed in every Meta placement they fit. */
export function PreviewSwitcher({ ad }: { ad: Pick<AdRecord, "art" | "copy" | "width" | "height" | "placement" | "platform"> }) {
  const options = PLACEMENTS.filter((p) => p.platform === ad.platform && (p.key === ad.placement || checkFit(ad.width, ad.height, p).status !== "unsupported"));
  const [placement, setPlacement] = useState(ad.placement);
  const current = PLACEMENTS.find((p) => p.key === placement);
  const fit = current ? checkFit(ad.width, ad.height, current) : { status: "ok" as const };
  return (
    <div className="space-y-3">
      {options.length > 1 && (
        <div role="group" aria-label="Preview placement" className="flex flex-wrap gap-1.5">
          {options.map((p) => (
            <button key={p.key} type="button" aria-pressed={p.key === placement} onClick={() => setPlacement(p.key)} className={`rounded-full border px-3 py-1 text-xs font-medium ${p.key === placement ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250 bg-white text-brand-neutral-750 hover:bg-brand-neutral-100"}`}>{p.label}</button>
          ))}
        </div>
      )}
      <div className="flex justify-center rounded-xl bg-brand-neutral-100 p-5">
        <PlacementPreview ad={ad} placement={placement} />
      </div>
      {fit.status === "cropped" && <p className="text-xs text-brand-orange-600">{fit.note}. Keep key content centered.</p>}
      {current?.verifiedOn === null && <p className="text-xs text-brand-neutral-650">Placement spec not yet verified against the platform&apos;s current docs.</p>}
    </div>
  );
}
