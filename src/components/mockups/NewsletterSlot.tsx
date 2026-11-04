import type { ReactNode } from "react";

export function NewsletterSlot({ media, width }: { media: ReactNode; width: number }) {
  const lines = (n: number) => Array.from({ length: n }, (_, i) => <div key={i} className="h-2 rounded bg-brand-neutral-200" style={{ width: `${95 - ((i * 17) % 40)}%` }} />);
  return (
    <div className="w-[420px] max-w-full overflow-hidden rounded-lg border border-neutral-300 bg-brand-neutral-100 p-3 shadow-sm" aria-label="Newsletter preview">
      <div className="mx-auto max-w-[360px] space-y-3 rounded bg-white p-4">
        <div className="flex items-center justify-between"><span className="h-3 w-28 rounded bg-brand-neutral-300" /><span className="text-[10px] text-brand-neutral-550">Issue 142</span></div>
        <div className="space-y-1.5">{lines(4)}</div>
        <div className="mx-auto overflow-hidden border border-dashed border-brand-neutral-300" style={{ width: Math.min(width, 330) }}>
          <p className="bg-brand-neutral-100 px-2 py-0.5 text-center text-[9px] uppercase tracking-wide text-brand-neutral-550">Sponsored</p>
          {media}
        </div>
        <div className="space-y-1.5">{lines(5)}</div>
      </div>
    </div>
  );
}
