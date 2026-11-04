"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Tooltip } from "@ark-ui/react/tooltip";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Verified-data mark (lucide badge-check). The explanation opens after a short hover or
 * on focus, and a click pins it open (Escape or an outside click closes it).
 */
export function VerifiedBadge({ platform = "LinkedIn", className }: { platform?: string; className?: string }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();
  const label = `Verified data, directly from ${platform}`;

  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setPinned(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPinned(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [pinned]);

  return (
    <span ref={wrap} className="inline-flex">
      <Tooltip.Root
        open={hover || pinned}
        onOpenChange={(d) => setHover(d.open)}
        openDelay={400}
        closeDelay={100}
        closeOnClick={false}
        positioning={{ placement: "top" }}
        ids={{ trigger: `${id}-t`, content: `${id}-c` }}
      >
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-describedby={`${id}-c`}
            aria-pressed={pinned}
            onClick={() => setPinned((p) => !p)}
            className={cn("inline-flex size-5 items-center justify-center rounded-full text-brand-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500", className)}
          >
            <BadgeCheck className="size-4" aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content className="z-50 max-w-60 rounded-lg bg-brand-neutral-850 px-3 py-2 text-xs leading-snug text-white shadow-lg">
            <span className="font-medium">Verified.</span> This benchmark comes straight from {platform}&rsquo;s own reporting, not an estimate.
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    </span>
  );
}
