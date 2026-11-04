export interface MetaStoryProps {
  imageUrl?: string;
  brand?: string;
  cta?: string;
  /** Fractions of height covered by platform UI (top/bottom). */
  safeZone?: { top: number; bottom: number };
  showSafeZone?: boolean;
}

export function MetaStory({ imageUrl, brand = "SurveyMonkey", cta = "Learn more", safeZone = { top: 0.14, bottom: 0.35 }, showSafeZone = true }: MetaStoryProps) {
  return (
    <div className="relative w-[270px] overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-200" style={{ aspectRatio: "9 / 16" }} aria-label="Stories and Reels preview">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-neutral-500">1080×1920</div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent p-3 text-white" style={{ height: `${safeZone.top * 100}%` }}>
        <div className="h-7 w-7 rounded-full bg-emerald-600" aria-hidden />
        <span className="text-xs font-semibold">{brand}</span>
        <span className="text-[10px] opacity-80">Sponsored</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-4" style={{ height: `${safeZone.bottom * 100}%` }}>
        <span className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900">{cta}</span>
      </div>
      {showSafeZone && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-red-500 bg-red-500/10" style={{ height: `${safeZone.top * 100}%` }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-red-500 bg-red-500/10" style={{ height: `${safeZone.bottom * 100}%` }} />
        </>
      )}
    </div>
  );
}
