"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, EyeOff, Lock, Minus, Plus, RotateCcw } from "lucide-react";
import { PlacementPreview } from "@/components/ads/PlacementPreview";
import { CompositionArt, type Selectable } from "@/components/ads/CompositionArt";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import { applyFix, moveLayer, nudge, resetTextOffset, resize, setBleed, setCtaFor, setExtend, setImage, setLogo, setLogoScale, setPreset, setText, setTextOffset, setVisible } from "@/lib/composition/edit";
import { LOGO_COLOR, LOGO_INFO, LOGO_MIN_CONTRAST, LOGO_SCALE_MAX, LOGO_SCALE_MIN, LOGO_VARIANTS, logoContrast, recommendedLogo } from "@/lib/composition/logo";
import { LogoMark } from "@/components/ads/LogoMark";
import { resetSize, resolveComposition, withTransform } from "@/lib/composition/defaults";
import { shapeOf } from "@/lib/composition/geometry";
import { backgroundColors, counts, photoGap, qaComposition, type QaContext, type QaIssue } from "@/lib/composition/qa";
import { placementRule } from "@/lib/composition/rules";
import { LAYER_LABEL, sizeKey, type Design, type LayerKind } from "@/lib/composition/types";
import type { ConceptSeed } from "@/lib/dummy/concepts";
import { artFor, conceptImagery } from "@/lib/dummy/library";
import { BG_PRESETS, getPreset } from "@/lib/imagery/library";
import { THEMES } from "@/lib/dummy/concepts";
import { ImagePicker } from "./ImagePicker";
import { QaIssues } from "./QaPanel";

export interface SizeOption {
  placementKey: string;
  width: number;
  height: number;
  label: string;
}

const field = "h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";
const STEP = 0.01;

export function qaForDesign(concept: ConceptSeed, design: Design, sizes: SizeOption[]): Map<string, QaIssue[]> {
  const out = new Map<string, QaIssue[]>();
  for (const s of sizes) {
    const ctx: QaContext = { placementKey: s.placementKey, width: s.width, height: s.height, supports: conceptImagery(concept), themeBg: THEMES[concept.theme].bg };
    out.set(sizeKey(s.width, s.height), qaComposition(resolveComposition(design, s.width, s.height, s.placementKey), ctx));
  }
  return out;
}

export function DesignEditor({ concept, design, onChange, sizes, platformCopy }: { concept: ConceptSeed; design: Design; onChange: (d: Design) => void; sizes: SizeOption[]; platformCopy: { intro: string; platformHeadline: string; landing: string } }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [selected, setSelected] = useState<Selectable>("headline");
  const [view, setView] = useState<"edit" | "platform">("edit");
  const [guides, setGuides] = useState(true);
  const [note, setNote] = useState("");
  const drag = useRef<({ kind: "photo" | "product"; px: number; py: number; x: number; y: number; scale: number } | { kind: "text"; px: number; py: number; dx: number; dy: number }) | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const size = sizes[Math.min(sizeIdx, sizes.length - 1)];
  const { width: w, height: h, placementKey } = size;
  const art = useMemo(() => artFor(concept), [concept]);
  const comp = useMemo(() => resolveComposition(design, w, h, placementKey), [design, w, h, placementKey]);
  const all = useMemo(() => qaForDesign(concept, design, sizes), [concept, design, sizes]);
  const issues = all.get(sizeKey(w, h)) ?? [];
  const supports = conceptImagery(concept);
  const rule = placementRule(placementKey);

  const sel = selected;
  const layerSel = sel === "photo" || sel === "product" ? sel : null;

  const setTransform = (kind: "photo" | "product", t: { x: number; y: number; scale: number }) => onChange(withTransform(design, w, h, kind, t));
  const cur = (kind: "photo" | "product") => ({ x: comp.layers[kind].x, y: comp.layers[kind].y, scale: comp.layers[kind].scale });

  const onPointerDown = (kind: "photo" | "product", e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = cur(kind);
    drag.current = { kind, px: e.clientX, py: e.clientY, ...t };
    setSelected(kind);
  };
  const textOff = { dx: comp.text.dx ?? 0, dy: comp.text.dy ?? 0 };
  const setOffset = (dx: number, dy: number) => onChange(setTextOffset(design, w, h, placementKey, dx, dy));
  const onTextPointerDown = (e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: "text", px: e.clientX, py: e.clientY, ...textOff };
    setSelected("headline");
  };
  const onTextKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const big = e.shiftKey ? 5 : 1;
    const map: Record<string, [number, number]> = { ArrowLeft: [-STEP * big, 0], ArrowRight: [STEP * big, 0], ArrowUp: [0, -STEP * big], ArrowDown: [0, STEP * big] };
    const m = map[e.key];
    if (m) { e.preventDefault(); setOffset(textOff.dx + m[0], textOff.dy + m[1]); setNote("Headline moved."); }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    if (d.kind === "text") return setOffset(d.dx + (e.clientX - d.px) / r.width, d.dy + (e.clientY - d.py) / r.height);
    setTransform(d.kind, nudge({ x: d.x, y: d.y, scale: d.scale }, (e.clientX - d.px) / r.width, (e.clientY - d.py) / r.height));
  };
  const endDrag = () => { drag.current = null; };
  const onKeyDown = (kind: "photo" | "product", e: KeyboardEvent<HTMLElement>) => {
    const big = e.shiftKey ? 5 : 1;
    const t = cur(kind);
    const map: Record<string, () => void> = {
      ArrowLeft: () => setTransform(kind, nudge(t, -STEP * big, 0)),
      ArrowRight: () => setTransform(kind, nudge(t, STEP * big, 0)),
      ArrowUp: () => setTransform(kind, nudge(t, 0, -STEP * big)),
      ArrowDown: () => setTransform(kind, nudge(t, 0, STEP * big)),
      "+": () => setTransform(kind, resize(t, 0.02 * big)),
      "=": () => setTransform(kind, resize(t, 0.02 * big)),
      "-": () => setTransform(kind, resize(t, -0.02 * big)),
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); const n = cur(kind); setNote(`${LAYER_LABEL[kind]} at ${Math.round(n.x * 100)}% across, ${Math.round(n.y * 100)}% down, ${Math.round(n.scale * 100)}% wide`); }
  };

  const fixAlso = (i: QaIssue) => i.alsoFix && onChange(applyFix(design, i.alsoFix.id, { width: w, height: h, placementKey, target: i.target, themeBg: THEMES[concept.theme].bg }));
  const gap = photoGap(comp, w, h);
  const extending = design.content.layers.photo.bleed && design.content.layers.photo.extend === "blur";
  const fixIssue = (i: QaIssue) => i.fix && onChange(applyFix(design, i.fix.id, { width: w, height: h, placementKey, target: i.target, themeBg: THEMES[concept.theme].bg }));
  const sizesWith = (i: QaIssue) => sizes.filter((s) => (all.get(sizeKey(s.width, s.height)) ?? []).some((x) => x.id === i.id)).length;
  const fixAll = (i: QaIssue) => {
    if (!i.fix) return;
    let d = design;
    for (const s of sizes) if ((all.get(sizeKey(s.width, s.height)) ?? []).some((x) => x.id === i.id)) d = applyFix(d, i.fix.id, { width: s.width, height: s.height, placementKey: s.placementKey, target: i.target, themeBg: THEMES[concept.theme].bg });
    onChange(d);
    setNote(`Applied "${i.fix.label}" at ${sizesWith(i)} sizes.`);
  };
  const others = sizes.map((s, idx) => ({ s, idx, n: counts(all.get(sizeKey(s.width, s.height)) ?? []) })).filter((x) => x.idx !== sizeIdx && (x.n.errors || x.n.warnings));

  const orderTopFirst = [...design.content.order].reverse();
  const maxW = w / h >= 1 ? 620 : Math.round(540 * (w / h));
  const sameShape = sizes.filter((s) => (s.width !== w || s.height !== h) && shapeOf(s.width, s.height) === shapeOf(w, h));

  const applyToSimilar = (kind: "photo" | "product") => {
    let d = design;
    for (const s of sameShape) d = withTransform(d, s.width, s.height, kind, cur(kind));
    onChange(d);
    setNote(`${LAYER_LABEL[kind]} position copied to ${sameShape.length} similar size${sameShape.length === 1 ? "" : "s"}.`);
  };

  const t = design.content.text;
  const showCta = comp.text.showCta;
  const layerInfo = (k: LayerKind) => design.content.layers[k];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-brand-neutral-650">Size
          <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))} className={`${field} mt-1 block w-64`}>
            {sizes.map((s, i) => { const n = counts(all.get(sizeKey(s.width, s.height)) ?? []); return <option key={`${s.placementKey}-${s.width}x${s.height}`} value={i}>{s.width}×{s.height} · {s.label}{n.errors ? ` (${n.errors} error${n.errors === 1 ? "" : "s"})` : n.warnings ? ` (${n.warnings} warning${n.warnings === 1 ? "" : "s"})` : ""}</option>; })}
          </select>
        </label>
        <div role="group" aria-label="Canvas view" className="inline-flex gap-1 rounded-lg bg-brand-neutral-150 p-1">
          {([["edit", "Edit"], ["platform", `In ${rule.platform === "linkedin" ? "LinkedIn" : rule.platform === "meta" ? "Meta" : rule.platform === "newsletter" ? "newsletter" : "page"}`]] as const).map(([v, l]) => (
            <Button key={v} size="sm" variant={view === v ? "outline" : "ghost"} aria-pressed={view === v} className={view === v ? "" : "bg-transparent"} onClick={() => setView(v)}>{l}</Button>
          ))}
        </div>
        {view === "edit" && <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="accent-brand-green-600" />Show guides{rule.safe ? " and safe zones" : ""}</label>}
        <Button variant="ghost" size="md" onClick={() => onChange(resetSize(design, w, h))} className="ml-auto"><RotateCcw /> Reset this size</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-brand-neutral-100 p-5">
            {view === "edit" ? (
              <div ref={wrap} style={{ width: "100%", maxWidth: maxW }} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} className="shadow-sm">
                <CompositionArt composition={comp} art={art} width={w} height={h} placementKey={placementKey} guides={guides} editor={{ selected, onSelect: setSelected, onLayerPointerDown: onPointerDown, onLayerKeyDown: onKeyDown, onTextPointerDown, onTextKeyDown }} />
              </div>
            ) : (
              <PlacementPreview ad={{ art, copy: { headline: t.headline, intro: platformCopy.intro, platformHeadline: platformCopy.platformHeadline, cta: t.cta, landing: platformCopy.landing }, width: w, height: h, placement: placementKey, composition: comp }} placement={placementKey} />
            )}
          </div>
          {gap > 0.002 && !extending && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-red-200 bg-brand-red-100/50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">The photo doesn&apos;t fill the ad ({Math.round(gap * 100)}% empty).</span>
              <Button size="sm" variant="outline" onClick={() => onChange(applyFix(design, "scale-to-fill", { width: w, height: h, placementKey, themeBg: THEMES[concept.theme].bg }))}>Scale to fill</Button>
              <Button size="sm" onClick={() => onChange(setExtend(design, "blur"))}>Extend background</Button>
            </div>
          )}
          <p className="text-xs text-brand-neutral-650" aria-live="polite">{note || "Drag a photo, product or the headline to move it, or focus it and use the arrow keys (Shift for bigger steps). + / − resize an image."}</p>
          <Card title={`Checks for ${w}×${h}`} description={(() => { const n = counts(issues); return n.errors || n.warnings ? `${n.errors} error${n.errors === 1 ? "" : "s"}, ${n.warnings} warning${n.warnings === 1 ? "" : "s"}` : "All clear"; })()}>
            <QaIssues issues={issues} onFix={fixIssue} onFixAlso={fixAlso} onFixAll={fixAll} sizesWith={sizesWith} />
            {others.length > 0 && (
              <div className="mt-4 border-t border-brand-neutral-150 pt-3">
                <p className="mb-2 text-xs font-medium text-brand-neutral-650">Other sizes with issues</p>
                <ul className="flex flex-wrap gap-1.5">{others.map(({ s, idx, n }) => <li key={`${s.placementKey}-${s.width}x${s.height}`}><button type="button" onClick={() => setSizeIdx(idx)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${n.errors ? "border-brand-red-200 bg-brand-red-100 text-brand-red-700" : "border-brand-yellow-200 bg-brand-yellow-100 text-brand-yellow-800"}`}>{s.width}×{s.height} · {n.errors ? `${n.errors} error${n.errors === 1 ? "" : "s"}` : `${n.warnings} warning${n.warnings === 1 ? "" : "s"}`}</button></li>)}</ul>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Layers" description="Top of the list is the front. Turn layers on or off and reorder them." padded={false}>
            <ul className="divide-y divide-brand-neutral-150">
              {orderTopFirst.map((k, i) => {
                const st = layerInfo(k);
                const unsupported = k !== "background" && !supports[k];
                return (
                  <li key={k} className={`flex items-center gap-1.5 px-3 py-2 ${sel === k ? "bg-brand-periwinkle-100/60" : ""}`}>
                    <button type="button" disabled={unsupported} onClick={() => setSelected(k)} aria-pressed={sel === k} className="min-w-0 flex-1 rounded px-1 py-1 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500 disabled:text-brand-neutral-550">
                      {LAYER_LABEL[k]}
                      <span className="block truncate text-xs font-normal text-brand-neutral-650">{unsupported ? "Not part of this template" : k === "background" ? (getPreset(st.preset)?.name ?? "Concept color") : st.image ? (st.image.source === "gallery" ? "Approved library" : st.image.name) : "No image"}</span>
                    </button>
                    <Button variant="ghost" size="sm" mode="icon" disabled={unsupported} aria-pressed={st.visible} aria-label={`${st.visible ? "Hide" : "Show"} ${LAYER_LABEL[k]}`} onClick={() => onChange(setVisible(design, k, !st.visible))}>{st.visible ? <Eye /> : <EyeOff />}</Button>
                    <Button variant="ghost" size="sm" mode="icon" disabled={i === 0} aria-label={`Bring ${LAYER_LABEL[k]} forward`} onClick={() => onChange(moveLayer(design, k, 1))}><ArrowUp /></Button>
                    <Button variant="ghost" size="sm" mode="icon" disabled={i === orderTopFirst.length - 1} aria-label={`Send ${LAYER_LABEL[k]} backward`} onClick={() => onChange(moveLayer(design, k, -1))}><ArrowDown /></Button>
                  </li>
                );
              })}
              <li className={`flex items-center gap-2 px-3 py-2 ${sel === "headline" ? "bg-brand-periwinkle-100/60" : ""}`}><button type="button" onClick={() => setSelected("headline")} aria-pressed={sel === "headline"} className="flex-1 rounded px-1 py-1 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500">Headline<span className="block truncate text-xs font-normal text-brand-neutral-650">{t.headline}</span></button></li>
              <li className={`flex items-center gap-2 px-3 py-2 ${sel === "cta" ? "bg-brand-periwinkle-100/60" : ""}`}><button type="button" onClick={() => setSelected("cta")} aria-pressed={sel === "cta"} className="flex-1 rounded px-1 py-1 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500">CTA button<span className="block text-xs font-normal text-brand-neutral-650">{showCta ? t.cta : rule.uiAddsCta ? "Added by the platform" : "Off"}</span></button></li>
              <li className={`flex items-center gap-2 px-3 py-2 ${sel === "logo" ? "bg-brand-periwinkle-100/60" : ""}`}><button type="button" onClick={() => setSelected("logo")} aria-pressed={sel === "logo"} className="flex-1 rounded px-1 py-1 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500">Brand mark<span className="block text-xs font-normal text-brand-neutral-650">{LOGO_INFO[design.content.logo ?? "green"].label} · position locked</span></button><Lock className="size-3.5 text-brand-neutral-550" aria-hidden /></li>
            </ul>
          </Card>

          <Card title={sel === "headline" ? "Headline" : sel === "cta" ? "CTA button" : sel === "logo" ? "Brand mark" : LAYER_LABEL[sel]}>
            {sel === "background" && (
              <div className="space-y-3">
                <ul className="grid grid-cols-3 gap-2" aria-label="Background presets">
                  {BG_PRESETS.map((p) => {
                    const on = (design.content.layers.background.preset ?? "theme") === p.id;
                    const bg = p.id === "theme" ? THEMES[concept.theme].bg : p.css;
                    return <li key={p.id}><button type="button" aria-pressed={on} onClick={() => onChange(setPreset(design, p.id))} className={`w-full rounded-lg border p-1 text-left ${on ? "border-brand-green-600 ring-2 ring-brand-green-600/30" : "border-brand-neutral-200 hover:border-brand-neutral-300"}`}><span className="block aspect-[4/3] rounded" style={{ background: bg }} /><span className="mt-1 block truncate text-[11px]">{p.name}</span></button></li>;
                  })}
                </ul>
                <p className="text-xs text-brand-neutral-650">Text color adjusts automatically to stay readable.</p>
              </div>
            )}

            {layerSel && (
              <div className="space-y-4">
                <ImagePicker kind={layerSel} value={layerInfo(layerSel).image} onPick={(r) => onChange(setImage(design, layerSel, r))} />
                {layerSel === "photo" && (
                  <div className="space-y-2 border-t border-brand-neutral-150 pt-3">
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!design.content.layers.photo.bleed} onChange={(e) => onChange(setBleed(design, e.target.checked))} className="mt-0.5 accent-brand-green-600" /><span>Full-bleed background<span className="block text-xs text-brand-neutral-650">The photo fills the whole ad. Drag to reposition it; if it stops covering the ad you can extend the background.</span></span></label>
                    {design.content.layers.photo.bleed && (
                      <div className="rounded-lg bg-brand-neutral-100 p-2.5 text-xs text-brand-neutral-750">
                        {gap > 0.002 && !extending ? <p className="font-medium text-brand-red-500">{Math.round(gap * 100)}% of the ad isn&apos;t covered at {w}×{h}.</p> : extending ? <p className="font-medium">Extended with a blurred copy of the photo.</p> : <p>Fully covered at {w}×{h}.</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => onChange(applyFix(design, "scale-to-fill", { width: w, height: h, placementKey, themeBg: THEMES[concept.theme].bg }))}>Scale to fill</Button>
                          {extending ? <Button size="sm" variant="ghost" onClick={() => onChange(setExtend(design, "none"))}>Remove extension</Button> : <Button size="sm" variant="outline" onClick={() => onChange(setExtend(design, "blur"))}>Extend background</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <fieldset className="space-y-2 border-t border-brand-neutral-150 pt-3">
                  <legend className="text-xs font-medium text-brand-neutral-650">Position (this size)</legend>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(["x", "y"] as const).map((a) => (
                        <label key={a} className="text-xs text-brand-neutral-650">{a === "x" ? "Across" : "Down"} %
                          <input type="number" value={Math.round(comp.layers[layerSel][a] * 100)} onChange={(e) => setTransform(layerSel, nudge(cur(layerSel), a === "x" ? Number(e.target.value) / 100 - cur(layerSel).x : 0, a === "y" ? Number(e.target.value) / 100 - cur(layerSel).y : 0))} className={`${field} mt-1`} />
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1" role="group" aria-label="Nudge">
                      <span /><Button size="sm" variant="outline" mode="icon" aria-label="Nudge up" onClick={() => setTransform(layerSel, nudge(cur(layerSel), 0, -STEP))}><ArrowUp /></Button><span />
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge left" onClick={() => setTransform(layerSel, nudge(cur(layerSel), -STEP, 0))}><ArrowLeft /></Button>
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge down" onClick={() => setTransform(layerSel, nudge(cur(layerSel), 0, STEP))}><ArrowDown /></Button>
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge right" onClick={() => setTransform(layerSel, nudge(cur(layerSel), STEP, 0))}><ArrowRight /></Button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="size-range" className="flex justify-between text-xs text-brand-neutral-650"><span>Size</span><span className="tabular-nums">{Math.round(comp.layers[layerSel].scale * 100)}% of width</span></label>
                    <div className="mt-1 flex items-center gap-2">
                      <Button size="sm" variant="outline" mode="icon" aria-label="Smaller" onClick={() => setTransform(layerSel, resize(cur(layerSel), -0.02))}><Minus /></Button>
                      <input id="size-range" type="range" min={5} max={160} value={Math.round(comp.layers[layerSel].scale * 100)} onChange={(e) => setTransform(layerSel, { ...cur(layerSel), scale: Number(e.target.value) / 100 })} className="flex-1 accent-brand-green-600" />
                      <Button size="sm" variant="outline" mode="icon" aria-label="Larger" onClick={() => setTransform(layerSel, resize(cur(layerSel), 0.02))}><Plus /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => onChange(resetSize(design, w, h, layerSel))}><RotateCcw /> Reset layer</Button>
                    {sameShape.length > 0 && <Button size="sm" variant="ghost" onClick={() => applyToSimilar(layerSel)}>Apply to {sameShape.length} similar size{sameShape.length === 1 ? "" : "s"}</Button>}
                  </div>
                </fieldset>
              </div>
            )}

            {sel === "headline" && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-brand-neutral-650">Text<textarea rows={3} value={t.headline} onChange={(e) => onChange(setText(design, { headline: e.target.value }))} className={`${field} mt-1 h-auto py-1.5`} /></label>
                <label className="block text-xs font-medium text-brand-neutral-650">Size <span className="tabular-nums">{Math.round(t.headlineScale * 100)}%</span><input type="range" min={60} max={140} value={Math.round(t.headlineScale * 100)} onChange={(e) => onChange(setText(design, { headlineScale: Number(e.target.value) / 100 }))} className="mt-1 block w-full accent-brand-green-600" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-brand-neutral-650">Align<select value={t.align} onChange={(e) => onChange(setText(design, { align: e.target.value as "left" | "center" | "right" }))} className={`${field} mt-1`}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                  <label className="text-xs font-medium text-brand-neutral-650">Color<select value={t.color} onChange={(e) => onChange(setText(design, { color: e.target.value as "auto" | "dark" | "light" }))} className={`${field} mt-1`}><option value="auto">Automatic</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.scrim} onChange={(e) => onChange(setText(design, { scrim: e.target.checked }))} className="accent-brand-green-600" />Add a scrim behind the text</label>
                <fieldset className="space-y-2 border-t border-brand-neutral-150 pt-3">
                  <legend className="text-xs font-medium text-brand-neutral-650">Move text (this size)</legend>
                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-3 gap-1" role="group" aria-label="Nudge text">
                      <span /><Button size="sm" variant="outline" mode="icon" aria-label="Nudge text up" onClick={() => setOffset(textOff.dx, textOff.dy - STEP)}><ArrowUp /></Button><span />
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge text left" onClick={() => setOffset(textOff.dx - STEP, textOff.dy)}><ArrowLeft /></Button>
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge text down" onClick={() => setOffset(textOff.dx, textOff.dy + STEP)}><ArrowDown /></Button>
                      <Button size="sm" variant="outline" mode="icon" aria-label="Nudge text right" onClick={() => setOffset(textOff.dx + STEP, textOff.dy)}><ArrowRight /></Button>
                    </div>
                    <div className="min-w-0 text-xs text-brand-neutral-650">
                      <p className="tabular-nums">{Math.round(textOff.dx * 100)}% across, {Math.round(textOff.dy * 100)}% down</p>
                      <Button size="sm" variant="ghost" disabled={!textOff.dx && !textOff.dy} onClick={() => onChange(resetTextOffset(design, w, h))}><RotateCcw /> Reset</Button>
                    </div>
                  </div>
                  <p className="text-xs text-brand-neutral-650">You can also drag the headline on the canvas. It stays inside the ad, and checks warn if it enters platform UI or covers the logo.</p>
                </fieldset>
              </div>
            )}

            {sel === "logo" && (() => {
              const bgs = backgroundColors(comp, THEMES[concept.theme].bg);
              const rec = recommendedLogo(bgs);
              const current = design.content.logo ?? "green";
              return (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs text-brand-neutral-650">The mark&apos;s position is fixed by the template. Choose its color and, within limits, its size.</legend>
                  <label className="block rounded-lg border border-brand-neutral-200 p-2.5 text-xs font-medium text-brand-neutral-650">Size <span className="tabular-nums">{Math.round((design.content.logoScale ?? 1) * 100)}%</span> <span className="font-normal">(allowed {Math.round(LOGO_SCALE_MIN * 100)}–{Math.round(LOGO_SCALE_MAX * 100)}%)</span>
                    <input type="range" min={Math.round(LOGO_SCALE_MIN * 100)} max={Math.round(LOGO_SCALE_MAX * 100)} value={Math.round((design.content.logoScale ?? 1) * 100)} onChange={(e) => onChange(setLogoScale(design, Number(e.target.value) / 100))} className="mt-1 block w-full accent-brand-green-600" />
                  </label>
                  {LOGO_VARIANTS.map((v) => {
                    const ratio = logoContrast(v, bgs);
                    const ok = ratio >= LOGO_MIN_CONTRAST;
                    return (
                      <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${current === v ? "border-brand-green-600 bg-brand-green-100/40" : "border-brand-neutral-200 hover:bg-brand-neutral-50"}`}>
                        <input type="radio" name="logo" checked={current === v} onChange={() => onChange(setLogo(design, v))} className="accent-brand-green-600" />
                        <span className="grid h-10 w-24 shrink-0 place-items-center rounded" style={{ background: bgs[0] }}><LogoMark variant={v} compact size="14px" /></span>
                        <span className="min-w-0 text-sm">
                          <span className="flex flex-wrap items-center gap-1.5 font-medium">{LOGO_INFO[v].label}{v === "green" && <span className="rounded bg-brand-neutral-150 px-1.5 py-0.5 text-[10px] font-medium text-brand-neutral-750">Default</span>}{v === rec && v !== "green" && <span className="rounded bg-brand-green-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-green-800">Recommended here</span>}</span>
                          <span className="block text-xs text-brand-neutral-650">{LOGO_INFO[v].use}</span>
                          <span className={`block text-[11px] ${ok ? "text-brand-neutral-550" : "text-brand-red-500"}`}>{ratio.toFixed(1)}:1 on this background{ok ? "" : ` (needs ${LOGO_MIN_CONTRAST}:1)`}</span>
                        </span>
                      </label>
                    );
                  })}
                  <span className="sr-only" style={{ color: LOGO_COLOR[current] }}>Selected: {LOGO_INFO[current].label}</span>
                </fieldset>
              );
            })()}

            {sel === "cta" && (
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={showCta} onChange={(e) => onChange(setCtaFor(design, placementKey, e.target.checked))} className="mt-0.5 accent-brand-green-600" /><span>Show a CTA button in the image<span className="block text-xs text-brand-neutral-650">{rule.uiAddsCta ? "Off by default: this platform adds its own CTA button." : "On by default: there is no platform button here."} Applies to every size in this placement.</span></span></label>
                <label className="block text-xs font-medium text-brand-neutral-650">Button text<input value={t.cta} maxLength={40} onChange={(e) => onChange(setText(design, { cta: e.target.value }))} className={`${field} mt-1`} /></label>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
