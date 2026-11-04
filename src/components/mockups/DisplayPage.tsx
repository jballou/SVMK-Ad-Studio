import type { ReactNode } from "react";

/** A publisher article with the ad slotted into its slot. The slot keeps the creative's real pixel ratio. */
export function DisplayPage({ media, width, height }: { media: ReactNode; width: number; height: number }) {
  const banner = width / height > 3;
  const tall = height > width * 1.5;
  const slot = (
    <div className="shrink-0 overflow-hidden border border-dashed border-brand-neutral-300 bg-white" style={{ width: Math.min(width, banner ? 460 : 260) }} aria-label={`${width} by ${height} ad slot`}>{media}</div>
  );
  const lines = (n: number) => Array.from({ length: n }, (_, i) => <div key={i} className="h-2 rounded bg-brand-neutral-200" style={{ width: `${88 - ((i * 13) % 34)}%` }} />);
  return (
    <div className="w-[480px] max-w-full overflow-hidden rounded-lg border border-neutral-300 bg-white p-4 shadow-sm" aria-label="Display page preview">
      <div className="mb-3 flex items-center gap-2"><span className="size-5 rounded bg-brand-neutral-250" aria-hidden /><span className="h-2.5 w-24 rounded bg-brand-neutral-300" /></div>
      {banner && <div className="mb-4 flex justify-center">{slot}</div>}
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-4/5 rounded bg-brand-neutral-300" />
          <div className="h-4 w-3/5 rounded bg-brand-neutral-300" />
          <div className="space-y-1.5 pt-2">{lines(tall ? 14 : 8)}</div>
        </div>
        {!banner && slot}
      </div>
    </div>
  );
}
