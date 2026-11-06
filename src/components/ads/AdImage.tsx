"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A real exported creative (e.g. from Figma) shown in the ad's own aspect ratio. Shapes close to the image's
 * shape fill the box; very different shapes show the whole image on a neutral background instead of cropping text.
 * If the file is missing (it isn't deployed), the generated art passed as `fallback` is shown.
 */
export function AdImage({ src, width, height, label, fallback, className = "" }: { src: string; width: number; height: number; label: string; fallback: ReactNode; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [natRatio, setNatRatio] = useState<number | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  // A failure can happen before hydration, when onError never fires.
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth === 0) setFailed(true);
    else setNatRatio(el.naturalWidth / el.naturalHeight);
  }, [src]);
  if (failed) return <>{fallback}</>;
  const ratio = width / height;
  // Fill the box when the image is close to the ad's shape; otherwise show all of it over a soft copy of itself.
  const fits = Math.abs(Math.log(ratio / (natRatio ?? ratio))) < 0.15;
  return (
    <div role="img" aria-label={label} className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `${width} / ${height}`, background: "#F2F1EF" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!fits && <img aria-hidden alt="" src={src} loading="lazy" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px) saturate(1.1)", transform: "scale(1.3)", opacity: 0.55 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} onLoad={(e) => setNatRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fits ? "cover" : "contain" }} />
    </div>
  );
}
