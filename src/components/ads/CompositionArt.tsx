import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { brandBox, headlineCss, shapeOf, textBox } from "@/lib/composition/geometry";
import { backgroundColors, resolveTextColor } from "@/lib/composition/qa";
import { placementRule } from "@/lib/composition/rules";
import type { Composition, LayerKind } from "@/lib/composition/types";
import { assetUrl, getAsset, getPreset } from "@/lib/imagery/library";
import { imageAspect, layerBox } from "@/lib/composition/geometry";
import type { AdArtSpec } from "@/lib/ads/types";
import { PAPER } from "@/lib/composition/color";

export type Selectable = LayerKind | "headline" | "cta";

export interface EditorBindings {
  selected: Selectable | null;
  onSelect: (k: Selectable) => void;
  onLayerPointerDown: (k: "photo" | "product", e: PointerEvent<HTMLElement>) => void;
  onLayerKeyDown: (k: "photo" | "product", e: KeyboardEvent<HTMLElement>) => void;
}

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
const SELECT: CSSProperties = { outline: "2px solid #7068EB", outlineOffset: 2 };

/**
 * Renders a resolved composition: background, image layers in their stacking order, then text, CTA and brand mark.
 * Everything is sized in fractions or container units, so it scales from a thumbnail to full size.
 */
export function CompositionArt({ composition: c, art, width, height, placementKey, className = "", guides = false, editor, children }: {
  composition: Composition;
  art?: Pick<AdArtSpec, "bg" | "accent">;
  width: number;
  height: number;
  placementKey: string;
  className?: string;
  guides?: boolean;
  editor?: EditorBindings;
  children?: ReactNode;
}) {
  const themeBg = art?.bg ?? "#EDEBE8";
  const accent = art?.accent ?? "#08794A";
  const rule = placementRule(placementKey);
  const shape = shapeOf(width, height);
  const tb = textBox(width, height, rule.safe);
  const bm = brandBox(width, height, rule.safe);
  const textColor = resolveTextColor(c, themeBg);
  const bgColors = backgroundColors(c, themeBg);
  const preset = getPreset(c.layers.background.preset);
  const bgCss = !c.layers.background.visible ? PAPER : !preset || preset.id === "theme" ? themeBg : preset.css;
  const light = textColor === PAPER;
  const sel = editor?.selected ?? null;

  const bgLayer = (z: number) => (
    <div key="background" aria-hidden onClick={editor ? () => editor.onSelect("background") : undefined} className="absolute inset-0" style={{ background: bgCss, zIndex: z, ...(sel === "background" ? { boxShadow: "inset 0 0 0 3px #7068EB" } : {}) }} />
  );

  const imageLayer = (kind: "photo" | "product", z: number) => {
    const l = c.layers[kind];
    if (!l.visible || !l.image) return null;
    const box = layerBox(l, imageAspect(l.image), width, height);
    const style: CSSProperties = { position: "absolute", left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h), zIndex: z, ...(sel === kind ? SELECT : {}), ...(editor ? { cursor: "grab", touchAction: "none" } : {}) };
    const common = editor ? { tabIndex: 0, role: "button" as const, "aria-label": `${kind === "photo" ? "Photo" : "Product image"} layer. Arrow keys move, plus and minus resize.`, onPointerDown: (e: PointerEvent<HTMLElement>) => editor.onLayerPointerDown(kind, e), onKeyDown: (e: KeyboardEvent<HTMLElement>) => editor.onLayerKeyDown(kind, e), onFocus: () => editor.onSelect(kind) } : {};
    const src = l.image.source === "gallery" ? (getAsset(l.image.id) ? assetUrl(l.image.id) : undefined) : l.image.src;
    if (!src) {
      return <div key={kind} {...common} style={{ ...style, background: "repeating-linear-gradient(45deg,#E2DFDA,#E2DFDA 8px,#EDEBE8 8px,#EDEBE8 16px)", display: "grid", placeItems: "center", color: "#686764", fontSize: "2.4cqmin" }}>{l.image.source === "upload" ? l.image.name : "Missing image"}</div>;
    }
    const alt = l.image.source === "gallery" ? (getAsset(l.image.id)?.name ?? "") : l.image.name;
    // eslint-disable-next-line @next/next/no-img-element
    return <img key={kind} {...common} src={src} alt={alt} draggable={false} style={{ ...style, objectFit: kind === "photo" ? "cover" : "contain", userSelect: "none" }} />;
  };

  const items: ReactNode[] = [];
  c.order.forEach((k, i) => items.push(k === "background" ? bgLayer(i) : imageLayer(k, i)));

  const z = c.order.length + 1;
  const showScrim = c.text.scrim;
  const centered = c.text.align === "center" && shape !== "banner";
  const ctaStyle: CSSProperties = { background: accent, color: themeBg, borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap", fontSize: shape === "banner" ? "min(18cqh, 3.2cqw)" : "3.4cqmin", padding: shape === "banner" ? "0.5em 1em" : "0.7em 1.4em", ...(sel === "cta" ? SELECT : {}) };

  return (
    <div
      role="img"
      aria-label={`Ad creative, ${width} by ${height}: ${c.text.headline}`}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${width} / ${height}`, containerType: "size", background: PAPER }}
    >
      {items}
      {showScrim && <div aria-hidden className="absolute" style={{ left: 0, top: 0, width: "100%", height: pct(tb.y + tb.h + 0.06), zIndex: z, background: `linear-gradient(to bottom, ${light ? "rgba(36,36,35,0.55)" : "rgba(255,255,255,0.7)"}, transparent)`, ...(shape === "landscape" || shape === "banner" ? { width: pct(tb.x + tb.w + 0.06), height: "100%", background: `linear-gradient(to right, ${light ? "rgba(36,36,35,0.55)" : "rgba(255,255,255,0.7)"}, transparent)` } : {}) }} />}
      {bm && <span style={{ position: "absolute", left: pct(bm.x), top: pct(bm.y), zIndex: z + 2, fontSize: "3.2cqmin", fontWeight: 700, letterSpacing: "0.02em", color: textColor, opacity: 0.9, lineHeight: 1 }}>SurveyMonkey</span>}
      <div
        onClick={editor ? () => editor.onSelect("headline") : undefined}
        style={{ position: "absolute", left: pct(tb.x), top: pct(tb.y), width: pct(tb.w), height: pct(tb.h), zIndex: z + 1, display: "flex", flexDirection: "column", justifyContent: shape === "landscape" ? "center" : "flex-start", alignItems: centered ? "center" : "flex-start", textAlign: centered ? "center" : "left", gap: "3cqmin", color: textColor, cursor: editor ? "pointer" : undefined }}
      >
        <p style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, lineHeight: 1.1, fontSize: headlineCss(width, height, c.text.headlineScale), ...(sel === "headline" ? SELECT : {}) }}>{c.text.headline}</p>
        {c.text.showCta && shape !== "banner" && <span onClick={editor ? (e) => { e.stopPropagation(); editor.onSelect("cta"); } : undefined} style={ctaStyle}>{c.text.cta}</span>}
      </div>
      {c.text.showCta && shape === "banner" && <span onClick={editor ? () => editor.onSelect("cta") : undefined} style={{ ...ctaStyle, position: "absolute", left: "58%", top: "50%", transform: "translateY(-50%)", zIndex: z + 1 }}>{c.text.cta}</span>}
      {guides && (
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: z + 5 }}>
          {rule.safe && <>
            <div className="absolute inset-x-0 top-0" style={{ height: pct(rule.safe.top), background: "rgba(174,69,63,0.18)", borderBottom: "1px dashed #AE453F" }} />
            <div className="absolute inset-x-0 bottom-0" style={{ height: pct(rule.safe.bottom), background: "rgba(174,69,63,0.18)", borderTop: "1px dashed #AE453F" }} />
          </>}
          <div className="absolute" style={{ left: pct(tb.x), top: pct(tb.y), width: pct(tb.w), height: pct(tb.h), border: "1px dashed rgba(112,104,235,0.7)" }} />
        </div>
      )}
      {children}
      <span className="sr-only">Text color contrast checked against {bgColors.join(", ")}</span>
    </div>
  );
}
