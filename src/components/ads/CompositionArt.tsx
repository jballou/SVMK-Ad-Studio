import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { brandBox, headlineCss, shapeOf, textBox } from "@/lib/composition/geometry";
import { backgroundColors, resolveTextColor } from "@/lib/composition/qa";
import { placementRule } from "@/lib/composition/rules";
import type { Composition, LayerKind } from "@/lib/composition/types";
import { assetUrl, getAsset, getPreset } from "@/lib/imagery/library";
import { imageAspect, layerBox } from "@/lib/composition/geometry";
import type { AdArtSpec } from "@/lib/ads/types";
import { PAPER } from "@/lib/composition/color";
import { LogoMark } from "./LogoMark";

export type Selectable = LayerKind | "headline" | "cta" | "logo";

export interface EditorBindings {
  selected: Selectable | null;
  onSelect: (k: Selectable) => void;
  onLayerPointerDown: (k: "photo" | "product", e: PointerEvent<HTMLElement>) => void;
  onLayerKeyDown: (k: "photo" | "product", e: KeyboardEvent<HTMLElement>) => void;
  onTextPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  onTextKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
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
    const ref = l.image;
    const src = ref.source === "gallery" ? (getAsset(ref.id) ? assetUrl(ref.id) : undefined) : ref.source === "asset" ? `/api/assets/${ref.id}` : ref.src;
    if (!src) {
      return <div key={kind} {...common} style={{ ...style, background: "repeating-linear-gradient(45deg,#E2DFDA,#E2DFDA 8px,#EDEBE8 8px,#EDEBE8 16px)", display: "grid", placeItems: "center", color: "#686764", fontSize: "2.4cqmin" }}>{l.image.source !== "gallery" ? l.image.name : "Missing image"}</div>;
    }
    const alt = ref.source === "gallery" ? (getAsset(ref.id)?.name ?? "") : ref.name;
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img key={kind} {...common} src={src} alt={alt} draggable={false} style={{ ...style, objectFit: kind === "photo" ? "cover" : "contain", userSelect: "none" }} />;
    if (kind === "photo" && l.bleed && l.extend === "blur") {
      // Extend the background: a soft, enlarged copy of the photo fills whatever the photo itself doesn't cover.
      return [
        // eslint-disable-next-line @next/next/no-img-element
        <img key="photo-extend" aria-hidden alt="" src={src} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(2.4cqmin) saturate(1.05)", transform: "scale(1.25)", zIndex: z, pointerEvents: "none" }} />,
        img,
      ];
    }
    return img;
  };

  const items: ReactNode[] = [];
  c.order.forEach((k, i) => items.push(k === "background" ? bgLayer(i) : imageLayer(k, i)));

  const z = c.order.length + 1;
  const showScrim = c.text.scrim;
  const align = shape === "banner" ? "left" : c.text.align;
  const dx = c.text.dx ?? 0;
  const dy = c.text.dy ?? 0;
  const logoScale = c.logoScale ?? 1;
  const logoSize = shape === "banner" ? "min(24cqh, 1.9cqw)" : "3.2cqmin";
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
      <span
        onClick={editor ? () => editor.onSelect("logo") : undefined}
        style={{ position: "absolute", left: pct(bm.x), top: pct(bm.y), zIndex: z + 2, display: "inline-flex", ...(shape === "banner" ? { height: pct(bm.h), width: pct(bm.w), alignItems: "center" } : {}), ...(sel === "logo" ? SELECT : {}), cursor: editor ? "pointer" : undefined }}
      >
        <LogoMark variant={c.logo ?? "green"} compact={shape === "banner" && width < 500} size={logoScale === 1 ? logoSize : `calc(${logoSize} * ${logoScale})`} />
      </span>
      <div
        onClick={editor ? () => editor.onSelect("headline") : undefined}
        {...(editor?.onTextPointerDown ? { tabIndex: 0, role: "button" as const, "aria-label": "Headline. Drag to move; arrow keys nudge it.", onPointerDown: editor.onTextPointerDown, onKeyDown: editor.onTextKeyDown, onFocus: () => editor.onSelect("headline") } : {})}
        style={{ position: "absolute", left: pct(tb.x + dx), top: pct(tb.y + dy), width: pct(tb.w), height: pct(tb.h), zIndex: z + 1, display: "flex", flexDirection: "column", justifyContent: shape === "landscape" ? "center" : "flex-start", alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start", textAlign: align, gap: "3cqmin", color: textColor, cursor: editor ? "grab" : undefined, touchAction: editor ? "none" : undefined }}
      >
        <p style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, lineHeight: 1.1, fontSize: headlineCss(width, height, c.text.headlineScale), ...(sel === "headline" ? SELECT : {}) }}>{c.text.headline}</p>
        {c.text.showCta && shape !== "banner" && <span onClick={editor ? (e) => { e.stopPropagation(); editor.onSelect("cta"); } : undefined} style={ctaStyle}>{c.text.cta}</span>}
      </div>
      {c.text.showCta && shape === "banner" && <span onClick={editor ? () => editor.onSelect("cta") : undefined} style={{ ...ctaStyle, position: "absolute", left: "62%", top: "50%", transform: "translateY(-50%)", zIndex: z + 1 }}>{c.text.cta}</span>}
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
