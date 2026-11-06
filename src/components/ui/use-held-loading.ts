"use client";

import { useEffect, useState } from "react";
import { FADE_MS, MIN_VISIBLE_MS, SHOW_DELAY_MS } from "@/lib/loading";

/**
 * For client-side loads (data fetched in an effect). Returns "loading" while loading. If the loader ever became
 * visible, it keeps returning "loading" until the loader has played MIN_VISIBLE_MS, then "leaving" for the
 * fade-out, then "idle". A load that finishes before the loader would appear goes straight to "idle".
 */
export function useHeldLoading(loading: boolean): "idle" | "loading" | "leaving" {
  // When the loader became visible (SHOW_DELAY_MS after loading started); null while it hasn't.
  const [visibleSince, setVisibleSince] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const show = setTimeout(() => { setLeaving(false); setVisibleSince(performance.now()); }, SHOW_DELAY_MS);
    return () => clearTimeout(show);
  }, [loading]);

  useEffect(() => {
    if (loading || visibleSince === null) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - visibleSince));
    const leave = setTimeout(() => setLeaving(true), wait);
    const done = setTimeout(() => { setVisibleSince(null); setLeaving(false); }, wait + FADE_MS);
    return () => { clearTimeout(leave); clearTimeout(done); };
  }, [loading, visibleSince]);

  if (loading) return "loading";
  if (visibleSince === null) return "idle";
  return leaving ? "leaving" : "loading";
}
