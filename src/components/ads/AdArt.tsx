import type { AdArtSpec, AdCopy } from "@/lib/ads/types";
import type { Composition } from "@/lib/composition/types";
import { CompositionArt } from "./CompositionArt";

const FALLBACK: AdArtSpec = { bg: "#EDEBE8", fg: "#2F2E2D", accent: "#686764", layout: "left" };

/**
 * Generated stand-in for a Figma creative. Sizes everything from the container (cq units),
 * so it holds up from a 48px thumbnail to a full-size preview.
 */
export function AdArt({ art = FALLBACK, copy, width, height, className = "", showCta = true, composition, placementKey }: { art?: AdArtSpec; copy?: Pick<AdCopy, "headline" | "cta">; width: number; height: number; className?: string; showCta?: boolean; composition?: Composition; placementKey?: string }) {
  if (composition && placementKey) return <CompositionArt composition={composition} art={art} width={width} height={height} placementKey={placementKey} className={className} />;
  const ratio = width / height;
  const banner = ratio > 3;
  const wide = ratio > 1.6 && !banner;
  const headSize = banner ? "30cqh" : wide ? "9cqh" : "6.2cqmin";
  const justify = art.layout === "center" ? "center" : art.layout === "bottom" ? "flex-end" : "center";
  const align = art.layout === "center" ? "center" : "flex-start";
  return (
    <div
      role="img"
      aria-label={copy ? `Ad creative, ${width} by ${height}: ${copy.headline}` : `Ad creative, ${width} by ${height}`}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${width} / ${height}`, background: art.bg, color: art.fg, containerType: "size" }}
    >
      <div
        className="absolute inset-0 flex"
        style={{ flexDirection: banner ? "row" : "column", justifyContent: banner ? "space-between" : justify, alignItems: banner ? "center" : align, gap: "3cqmin", padding: banner ? "0 3cqw" : "7cqmin", textAlign: art.layout === "center" ? "center" : "left" }}
      >
        {!banner && <span style={{ fontSize: "3.2cqmin", fontWeight: 700, letterSpacing: "0.02em", opacity: 0.85 }}>SurveyMonkey</span>}
        {copy && (
          <p style={{ fontSize: headSize, lineHeight: 1.1, fontWeight: 700, margin: 0, maxWidth: banner ? "62cqw" : "100%", fontFamily: "Georgia, 'Times New Roman', serif" }}>{copy.headline}</p>
        )}
        {showCta && copy && (
          <span style={{ fontSize: banner ? "26cqh" : "3.4cqmin", background: art.accent, color: art.bg, padding: banner ? "0.5em 1em" : "0.7em 1.4em", borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap" }}>{copy.cta}</span>
        )}
      </div>
      <div aria-hidden className="absolute -right-[12cqmin] -bottom-[12cqmin] rounded-full" style={{ width: "42cqmin", height: "42cqmin", background: art.accent, opacity: 0.16 }} />
    </div>
  );
}
