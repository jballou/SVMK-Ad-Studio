// Reads a Figma frame (or a page of frames) and describes it as editable elements: text with limits, images, logo, CTA,
// layering and spacing. Pure functions over the node tree, so they are tested without calling Figma.
//
// Layers named with the `#slot` convention (#headline, #cta, #logo ...) are trusted. Everything else is inferred, because
// most existing files were never named that way: the largest text is the headline, a small filled box holding short text is
// the CTA, an instance called "Logo" is the brand mark, a big image fill is the picture.
import type { FigmaNode, FigmaPaint } from "@/lib/figma/client";
import { discoverFrames } from "@/lib/figma/discover";
import { parseSlotName } from "@/lib/figma/parse-frame-name";
import type { TemplateIssue } from "@/lib/figma/validate-template";
import { LOGO_COLOR, LOGO_VARIANTS, type LogoVariant } from "@/lib/composition/logo";
import { placementRule } from "@/lib/composition/rules";
import { allPlacements } from "@/lib/specs/platforms";
import type { Box, ElementRole, ElementSpec, FrameSpec, ImageInfo, TemplateSpec, TextInfo } from "./spec";

const SLOT_ROLE: Record<string, ElementRole> = {
  headline: "headline", subhead: "subhead", stat: "stat", cta: "cta", logo: "logo", hero: "image", product: "product", bg: "background-image",
};
const TEXT_ROLES = new Set<ElementRole>(["headline", "subhead", "stat", "body", "cta"]);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const visible = (n: FigmaNode) => n.visible !== false && (n.opacity === undefined || n.opacity > 0);
const fillsOf = (n: FigmaNode): FigmaPaint[] => (n.fills ?? []).filter((f) => f.visible !== false);
const hasImageFill = (n: FigmaNode) => fillsOf(n).some((f) => f.type === "IMAGE");

export function hex(c?: { r: number; g: number; b: number }): string | undefined {
  if (!c) return undefined;
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}
const solid = (n: FigmaNode) => hex(fillsOf(n).find((f) => f.type === "SOLID")?.color);

/** The subtree contains an image fill (self or any descendant). */
function subtreeHasImage(n: FigmaNode): boolean {
  return hasImageFill(n) || (n.children ?? []).some(subtreeHasImage);
}
/** The brand-mark color a Figma logo uses: the fill of its widest vector, snapped to the closest palette variant. */
export function logoVariantOf(n: FigmaNode): LogoVariant {
  let best: { w: number; c: { r: number; g: number; b: number } } | undefined;
  const walk = (x: FigmaNode) => {
    const c = fillsOf(x).find((f) => f.type === "SOLID")?.color;
    const w = x.absoluteBoundingBox?.width ?? 0;
    if (c && x.type !== "FRAME" && x.type !== "GROUP" && (!best || w > best.w)) best = { w, c };
    x.children?.forEach(walk);
  };
  walk(n);
  if (!best) return "green";
  const d = (v: LogoVariant) => { const t = LOGO_COLOR[v].match(/\w\w/g)!.map((h) => parseInt(h, 16) / 255); return (t[0] - best!.c.r) ** 2 + (t[1] - best!.c.g) ** 2 + (t[2] - best!.c.b) ** 2; };
  return (LOGO_VARIANTS as LogoVariant[]).reduce((m, v) => (d(v) < d(m) ? v : m), "green" as LogoVariant);
}
const nameInTree = (n: FigmaNode, re: RegExp): boolean => re.test(n.name) || (n.children ?? []).some((c) => nameInTree(c, re));

interface Cand {
  node: FigmaNode;
  role: ElementRole;
  source: "named" | "inferred";
  parentId: string;
  /** For a CTA, the filled box around the label. */
  container?: FigmaNode;
  maxChars?: number;
  order: number;
}

function textInfo(n: FigmaNode, boxPx: Box, named?: number): TextInfo {
  const st = n.style ?? {};
  const size = st.fontSize ?? 16;
  const chars = (n.characters ?? "").length;
  const lh = st.lineHeightPx ?? size * 1.2;
  const lines = Math.max(1, Math.round(boxPx.h / lh));
  // Average glyph width for a bold sans is ~0.5 of the font size; fine for a ballpark.
  const capacity = Math.max(chars, Math.floor(boxPx.w / (size * 0.5)) * lines);
  const grown = Math.ceil((chars * 1.25) / 5) * 5;
  return {
    chars,
    lines,
    font: { family: st.fontFamily, size: r3(size), weight: st.fontWeight, lineHeight: st.lineHeightPx ? r3(st.lineHeightPx) : undefined, letterSpacing: st.letterSpacing, textCase: st.textCase },
    align: (st.textAlignHorizontal ?? "LEFT").toLowerCase() as TextInfo["align"],
    color: solid(n),
    autoResize: st.textAutoResize,
    capacity,
    maxChars: named ?? Math.max(chars, Math.min(grown, capacity)),
  };
}

function imageInfo(n: FigmaNode, frame: Box): ImageInfo {
  const b = n.absoluteBoundingBox!;
  const mode = fillsOf(n).find((f) => f.type === "IMAGE")?.scaleMode;
  const fit = mode === "FILL" ? "fill" : mode === "FIT" ? "fit" : mode === "CROP" ? "crop" : mode === "TILE" ? "tile" : "unknown";
  const covers = (Math.min(b.x + b.width, frame.x + frame.w) - Math.max(b.x, frame.x)) * (Math.min(b.y + b.height, frame.y + frame.h) - Math.max(b.y, frame.y));
  return { fit, aspect: r3(b.height / Math.max(1, b.width)), coversFrame: covers >= 0.85 * frame.w * frame.h };
}

export function extractFrameSpec(frame: FigmaNode, meta: { conceptKey?: string; width?: number; height?: number } = {}): FrameSpec {
  const fb = frame.absoluteBoundingBox ?? { x: 0, y: 0, width: meta.width ?? 0, height: meta.height ?? 0 };
  const F: Box = { x: fb.x, y: fb.y, w: fb.width, h: fb.height };
  const width = meta.width ?? Math.round(F.w);
  const height = meta.height ?? Math.round(F.h);
  const issues: TemplateIssue[] = [];
  const cands: Cand[] = [];
  let decoration = 0;
  let order = 0;
  let bgColor = solid(frame);
  let bgImage = false;

  const push = (c: Omit<Cand, "order">) => cands.push({ ...c, order: order++ });
  const area = (n: FigmaNode) => (n.absoluteBoundingBox ? n.absoluteBoundingBox.width * n.absoluteBoundingBox.height : 0);

  const visit = (n: FigmaNode, parentId: string) => {
    if (!visible(n)) return;
    const slot = parseSlotName(n.name);
    if (slot) {
      const role = SLOT_ROLE[slot.slot] ?? "decoration";
      if (role === "background-image" || slot.slot === "bg") {
        if (hasImageFill(n)) bgImage = true;
        else bgColor = solid(n) ?? bgColor;
        if (!hasImageFill(n)) return;
      }
      push({ node: n, role, source: "named", parentId, maxChars: slot.maxChars });
      return;
    }
    const isContainer = n.type === "FRAME" || n.type === "GROUP" || n.type === "INSTANCE" || n.type === "COMPONENT";

    if (isContainer && /\blogo\b/i.test(n.name)) {
      const brand = n.type === "INSTANCE" && (/^logo$/i.test(n.name.trim()) || nameInTree(n, /surveymonkey|symbol/i));
      if (brand) push({ node: n, role: "logo", source: "inferred", parentId });
      else if (subtreeHasImage(n)) push({ node: n, role: "partner-logos", source: "inferred", parentId });
      else push({ node: n, role: "logo", source: "inferred", parentId });
      return;
    }
    if (n.type === "TEXT") {
      push({ node: n, role: "body", source: "inferred", parentId });
      return;
    }
    // A small filled box around short text is a button.
    if (isContainer && n.absoluteBoundingBox && fillsOf(n).some((f) => f.type === "SOLID")) {
      const kids = (n.children ?? []).filter(visible);
      const label = kids.length === 1 && kids[0].type === "TEXT" ? kids[0] : kids.filter((k) => k.type === "TEXT").length === 1 && kids.every((k) => k.type === "TEXT" || k.type === "VECTOR" || k.type === "ELLIPSE") ? kids.find((k) => k.type === "TEXT") : undefined;
      const b = n.absoluteBoundingBox;
      if (label && (label.characters ?? "").length <= 30 && b.height <= F.h * 0.2 && b.width / Math.max(1, b.height) >= 1.8 && b.width <= F.w * 0.7) {
        push({ node: label, role: "cta", source: "inferred", parentId, container: n });
        return;
      }
    }
    if (hasImageFill(n) && n.absoluteBoundingBox) {
      const covers = imageInfo(n, F).coversFrame;
      push({ node: n, role: covers ? "background-image" : "image", source: "inferred", parentId });
      if (covers) bgImage = true;
      return;
    }
    if (isContainer || n.type === "RECTANGLE") {
      if (n.type === "RECTANGLE" && area(n) >= 0.85 * F.w * F.h && !hasImageFill(n)) {
        bgColor = bgColor ?? solid(n);
        return;
      }
      if (n.children?.length) {
        n.children.forEach((c) => visit(c, n.id));
        return;
      }
    }
    if (n.type === "VECTOR" || n.type === "ELLIPSE" || n.type === "RECTANGLE" || n.type === "LINE" || n.type === "STAR") decoration++;
  };
  (frame.children ?? []).forEach((c) => visit(c, frame.id));

  // Text roles: named ones stay; the rest are ranked by size, then position.
  const texts = cands.filter((c) => c.node.type === "TEXT" && c.role === "body" && c.source === "inferred" && (c.node.characters ?? "").length > 2);
  texts.sort((a, b) => (b.node.style?.fontSize ?? 0) - (a.node.style?.fontSize ?? 0) || (a.node.absoluteBoundingBox?.y ?? 0) - (b.node.absoluteBoundingBox?.y ?? 0));
  const taken = new Set(cands.filter((c) => c.source === "named").map((c) => c.role));
  const sizes: number[] = [];
  for (const t of texts) {
    const size = t.node.style?.fontSize ?? 0;
    if (!sizes.includes(size)) sizes.push(size);
    if (sizes.indexOf(size) === 0 && !taken.has("headline")) { t.role = "headline"; taken.add("headline"); }
    else if (sizes.indexOf(size) <= 1 && !taken.has("subhead")) { t.role = "subhead"; taken.add("subhead"); }
  }

  // Collapse a row or grid of partner logos into one element: the lowest ancestor holding four or more logo-like layers.
  const parentOf = new Map<string, string>();
  const index = (n: FigmaNode, parent?: string) => { if (parent) parentOf.set(n.id, parent); n.children?.forEach((c) => index(c, n.id)); };
  index(frame);
  const small = (c: Cand) => area(c.node) < 0.08 * F.w * F.h;
  const logoLike = cands.filter((c) => c.role === "partner-logos" || (c.role === "image" && small(c)));
  const under = new Map<string, number>();
  const chain = (c: Cand) => { const out: string[] = []; for (let id = parentOf.get(c.node.id); id && id !== frame.id; id = parentOf.get(id)) out.push(id); return out; };
  for (const c of logoLike) for (const id of chain(c)) under.set(id, (under.get(id) ?? 0) + 1);
  const dropped = new Set<Cand>();
  const grids: { cand: Cand; count: number; box: Box }[] = [];
  const groups = new Map<string, Cand[]>();
  for (const c of logoLike) {
    const key = chain(c).find((id) => (under.get(id) ?? 0) >= 4);
    if (key) groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  for (const [, list] of groups) {
    const bs = list.map((c) => c.node.absoluteBoundingBox!);
    const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
    const x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height));
    list.slice(1).forEach((c) => dropped.add(c));
    list[0].role = "partner-logos";
    grids.push({ cand: list[0], count: list.length, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
  }

  const toBox = (b: { x: number; y: number; w: number; h: number }): Box => ({ x: r3(clamp01((b.x - F.x) / F.w)), y: r3(clamp01((b.y - F.y) / F.h)), w: r3(Math.min(1, b.w / F.w)), h: r3(Math.min(1, b.h / F.h)) });
  const toPx = (b: Box): Box => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });

  const elements: ElementSpec[] = [];
  let z = 0;
  for (const c of cands.filter((x) => !dropped.has(x)).sort((a, b) => a.order - b.order)) {
    const nb = (c.container ?? c.node).absoluteBoundingBox;
    if (!nb) continue;
    const grid = grids.find((g) => g.cand === c);
    const abs: Box = grid ? grid.box : { x: nb.x, y: nb.y, w: nb.width, h: nb.height };
    const rel = { x: abs.x - F.x, y: abs.y - F.y, w: abs.w, h: abs.h };
    const el: ElementSpec = {
      id: c.node.id, name: c.node.name, role: c.role, source: c.source,
      box: toBox(abs), px: toPx(rel), z: z++, locked: c.role === "logo" || c.role === "partner-logos" || c.role === "decoration",
    };
    if (grid) el.count = grid.count;
    if (c.node.type === "TEXT") {
      const tb = c.node.absoluteBoundingBox!;
      el.text = textInfo(c.node, { x: 0, y: 0, w: tb.width, h: tb.height }, c.maxChars);
      if (!TEXT_ROLES.has(el.role)) el.role = "body";
      // A glyph or two ("+", "→", a bullet) is an icon, not copy anyone edits.
      if (el.text.chars <= 2 && c.source === "inferred" && el.role !== "cta") { el.role = "decoration"; el.locked = true; delete el.text; }
    }
    if (c.role === "cta") {
      const cont = c.container;
      el.cta = { label: c.node.characters ?? "", fill: cont ? solid(cont) : undefined, textColor: solid(c.node), radius: cont?.cornerRadius };
    }
    if (el.role === "logo") {
      el.logo = { variant: logoVariantOf(c.node) };
    }
    if ((el.role === "image" || el.role === "background-image" || el.role === "product") && c.node.absoluteBoundingBox) el.image = imageInfo(c.node, F);
    elements.push(el);
  }

  // Spacing.
  const content = elements.filter((e) => e.role !== "background-image");
  const x0 = Math.min(...content.map((e) => e.box.x), 1), y0 = Math.min(...content.map((e) => e.box.y), 1);
  const x1 = Math.max(...content.map((e) => e.box.x + e.box.w), 0), y1 = Math.max(...content.map((e) => e.box.y + e.box.h), 0);
  const stacked = elements.filter((e) => e.text).sort((a, b) => a.box.y - b.box.y);
  const textGaps = stacked.slice(1).map((e, i) => e.px.y - (stacked[i].px.y + stacked[i].px.h)).filter((g) => g >= 0);

  const placements = allPlacements().filter((p) => p.sizes.some((s) => s.w === width && s.h === height)).map((p) => p.key);
  const spec: FrameSpec = {
    nodeId: frame.id, name: frame.name, conceptKey: meta.conceptKey ?? frame.name.replace(/_\d+x\d+$/, "").replace(/[^A-Za-z0-9]/g, ""),
    width, height, background: { color: bgColor, image: bgImage }, elements,
    layout: { margins: { top: r3(Math.max(0, content.length ? y0 : 0)), right: r3(Math.max(0, content.length ? 1 - x1 : 0)), bottom: r3(Math.max(0, content.length ? 1 - y1 : 0)), left: r3(Math.max(0, content.length ? x0 : 0)) }, textGaps, autoLayout: !!frame.layoutMode && frame.layoutMode !== "NONE" },
    placements, decorationCount: decoration, issues,
  };
  spec.issues.push(...checkFrame(spec));
  return spec;
}

/** Problems a designer should look at before the spec is confirmed. */
export function checkFrame(f: FrameSpec): TemplateIssue[] {
  const out: TemplateIssue[] = [];
  const add = (severity: TemplateIssue["severity"], code: string, message: string, nodeId?: string) => out.push({ severity, code, message, nodeId: nodeId ?? f.nodeId });
  const has = (r: ElementRole) => f.elements.some((e) => e.role === r);
  if (!has("headline")) add("error", "no-headline", "No headline found. The largest text should be the headline; name it #headline if it's not being picked up.");
  if (f.decorationCount >= 10) add("info", "many-shapes", `${f.decorationCount} loose shapes were treated as decoration. If some of them make up the picture, put them in one layer named #hero so it can be swapped.`);
  if (!has("logo")) add("warn", "no-logo", "No brand logo found. Use the Logo component instance (named \"Logo\" or #logo).");
  if (f.placements.length === 0) add("warn", "unknown-size", `${f.width}×${f.height} isn't a size Ad Studio generates yet.`);
  const rules = f.placements.map((k) => placementRule(k));
  if (rules.length && rules.every((r) => r.ctaRequired) && !has("cta")) add("error", "cta-required", "This size has no platform CTA button, so the creative needs its own. Add a button with short text, or a #cta layer.");
  if (rules.length && rules.every((r) => r.uiAddsCta) && has("cta")) add("warn", "cta-ui-adds", "The platform adds its own CTA button at this size, so a CTA in the image duplicates it.");
  const safe = rules.map((r) => r.safe).find(Boolean);
  for (const e of f.elements) {
    if (e.box.x + e.box.w > 1.02 || e.box.y + e.box.h > 1.02 || e.box.x < -0.02 || e.box.y < -0.02) add("warn", "outside", `"${e.name}" extends past the frame edge.`, e.id);
    if (e.text) {
      if (e.text.font.size < 12) add("warn", "text-small", `"${e.name}" is ${e.text.font.size}px, which is hard to read in an ad.`, e.id);
      if (e.text.autoResize === "NONE" || e.text.autoResize === "TRUNCATE") add("warn", "text-fixed", `"${e.name}" has a fixed box, so longer copy won't reflow. Set auto-height.`, e.id);
      if (safe && (e.box.y < safe.top - 0.001 || e.box.y + e.box.h > 1 - safe.bottom + 0.001) && e.role !== "background-image") add("warn", "safe-zone", `"${e.name}" sits in the area the platform's UI covers.`, e.id);
    }
  }
  const t = f.elements.filter((e) => e.text);
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const a = t[i].box, b = t[j].box;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.02 && oy > 0.02 && t[i].role !== "cta" && t[j].role !== "cta") add("warn", "text-overlap", `"${t[i].name}" and "${t[j].name}" overlap.`, t[j].id);
  }
  return out;
}

export function extractTemplateSpec(root: FigmaNode, source: { fileKey: string; nodeId?: string }): TemplateSpec {
  const issues: TemplateIssue[] = [];
  let frames: FrameSpec[] = [];
  let unmatched: TemplateSpec["unmatched"] = [];
  const found = discoverFrames(root, { allowLegacy: true });
  if (found.frames.length) {
    frames = found.frames.map((f) => extractFrameSpec(f.node, { conceptKey: f.conceptKey, width: f.width, height: f.height }));
    unmatched = found.unmatched;
  } else if (root.type === "FRAME" && root.absoluteBoundingBox) {
    // A link straight to one frame whose name has no size suffix: use its real size.
    frames = [extractFrameSpec(root)];
  } else {
    issues.push({ severity: "error", code: "no-frames", message: "No ad frames found. Link to a frame, or a page or section whose frames are named like Name_1200x1200." });
  }
  const limits: TemplateSpec["limits"] = {};
  for (const f of frames) for (const e of f.elements) if (e.text) limits[e.role] = Math.min(limits[e.role] ?? Infinity, e.text.maxChars);
  return { version: 1, source, frames, unmatched, limits, issues };
}
