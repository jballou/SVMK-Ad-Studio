import type { ReactNode } from "react";

export type MetaVariant = "facebook" | "instagram" | "threads";

export interface MetaPostProps {
  variant: MetaVariant;
  brand?: string;
  primaryText: string;
  headline?: string;
  cta?: string;
  media?: ReactNode;
  imageUrl?: string;
  width: number;
  height: number;
}

const PLATFORM_LABEL: Record<MetaVariant, string> = { facebook: "Facebook", instagram: "Instagram", threads: "Threads" };
const MAX_RATIO_TALL = 0.8; // Threads crops anything taller than 4:5

function Media({ media, imageUrl, width, height, crop }: { media?: ReactNode; imageUrl?: string; width: number; height: number; crop?: number }) {
  const ratio = crop && width / height < crop ? crop : width / height;
  return (
    <div className="w-full overflow-hidden bg-neutral-200" style={{ aspectRatio: `${ratio}` }}>
      {media ? (
        // Cropped placements center the creative and let the container clip the overflow.
        <div className="flex h-full w-full items-center justify-center">{media}</div>
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-neutral-500">{width}×{height}</div>
      )}
    </div>
  );
}

export function MetaPost({ variant, brand = "SurveyMonkey", primaryText, headline, cta = "Learn more", media, imageUrl, width, height }: MetaPostProps) {
  const crop = variant === "threads" ? MAX_RATIO_TALL : undefined;
  return (
    <article className="w-[360px] max-w-full overflow-hidden rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm" aria-label={`${PLATFORM_LABEL[variant]} feed preview`}>
      <header className="flex items-center gap-2 p-3">
        <div className={`h-9 w-9 shrink-0 ${variant === "facebook" ? "rounded-full" : "rounded-full ring-2 ring-pink-500"} bg-emerald-600`} aria-hidden />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold">{brand}</p>
          <p className="text-xs text-neutral-500">Sponsored · {PLATFORM_LABEL[variant]}</p>
        </div>
      </header>
      {variant === "facebook" && <p className="px-3 pb-2 text-sm">{primaryText}</p>}
      <Media media={media} imageUrl={imageUrl} width={width} height={height} crop={crop} />
      {variant === "instagram" && (
        <div className="flex items-center justify-between bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          {cta}<span aria-hidden>›</span>
        </div>
      )}
      {variant === "facebook" && (
        <div className="flex items-center justify-between gap-3 bg-neutral-100 p-3">
          <p className="min-w-0 truncate text-sm font-semibold">{headline}</p>
          <span className="shrink-0 rounded bg-neutral-300 px-3 py-1 text-sm font-semibold">{cta}</span>
        </div>
      )}
      {variant !== "facebook" && <p className="p-3 text-sm"><span className="font-semibold">{brand}</span> {primaryText}</p>}
    </article>
  );
}
