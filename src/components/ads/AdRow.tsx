import Link from "next/link";
import type { ReactNode } from "react";
import { AdArt } from "./AdArt";
import { PlatformBadge, StatusChip } from "./badges";
import type { AdRecord } from "@/lib/ads/types";

export function AdRow({ ad, right, showStatus = false }: { ad: AdRecord; right?: ReactNode; showStatus?: boolean }) {
  return (
    <Link href={`/gallery/${ad.name}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-periwinkle-500">
      <span className="w-14 shrink-0 overflow-hidden rounded border border-brand-neutral-200"><AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={false} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{ad.name}</span>
        <span className="mt-0.5 flex items-center gap-2"><PlatformBadge platform={ad.platform} />{showStatus && <StatusChip status={ad.status} />}<span className="text-xs text-brand-neutral-650">{ad.tags.funnel}</span></span>
      </span>
      {right}
    </Link>
  );
}
