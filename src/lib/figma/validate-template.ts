import { placementRule } from "@/lib/composition/rules";
import { PLACEMENTS } from "@/lib/specs/platforms";
import type { FigmaNode } from "./client";
import { discoverFrames, groupByConcept, type DiscoveredFrame } from "./discover";

export type Severity = "error" | "warn" | "info";
export interface TemplateIssue {
  severity: Severity;
  code: string;
  message: string;
  nodeId?: string;
}

export interface SizeReport {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  placements: string[];
  slots: string[];
  issues: TemplateIssue[];
}

export interface ConceptReport {
  conceptKey: string;
  sizes: SizeReport[];
  missingSizes: string[];
  issues: TemplateIssue[];
}

export interface TemplateReport {
  concepts: ConceptReport[];
  issues: TemplateIssue[];
  counts: { errors: number; warnings: number; info: number };
}

/** Slots the app understands, and what each must be in Figma. */
const TEXT_SLOTS = new Set(["headline", "subhead", "stat", "cta"]);
const IMAGE_SLOTS = new Set(["hero", "product"]);
const SHAPE_TYPES = new Set(["RECTANGLE", "ELLIPSE", "FRAME", "VECTOR", "INSTANCE", "GROUP", "COMPONENT"]);
const KNOWN = new Set([...TEXT_SLOTS, ...IMAGE_SLOTS, "bg", "logo"]);
const REQUIRED = ["headline", "bg", "logo"] as const;
const LIMIT_RECOMMENDED = new Set(["headline", "subhead", "cta"]);
export const DEFAULT_EXPECTED = ["linkedin-single-image", "facebook-feed", "instagram-feed", "meta-stories-reels", "display-standard"];

const fractionOutside = (box: { x: number; y: number; w: number; h: number }, band: { y0: number; y1: number }) => {
  const overlap = Math.max(0, Math.min(box.y + box.h, band.y1) - Math.max(box.y, band.y0));
  return box.h === 0 ? 0 : overlap / box.h;
};

function validateFrame(f: DiscoveredFrame): SizeReport {
  const issues: TemplateIssue[] = [];
  const add = (severity: Severity, code: string, message: string, nodeId?: string) => issues.push({ severity, code, message, nodeId: nodeId ?? f.nodeId });
  const placements = PLACEMENTS.filter((p) => p.sizes.some((s) => s.w === f.width && s.h === f.height)).map((p) => p.key);

  if (f.legacy) add("warn", "name-legacy", `Rename to "AD | ${f.conceptKey} | ${f.width}x${f.height}" so Ad Studio reads it without the legacy fallback.`);
  if (!/[A-Za-z]$/.test(f.conceptKey)) add("error", "key-ends-digit", `The concept key "${f.conceptKey}" ends in a digit, which makes ad names like ${f.conceptKey}112026_${f.width}x${f.height} ambiguous. End the key with a letter (e.g. "Enterprise80" → "80Enterprise").`);
  if (placements.length === 0) add("warn", "unknown-size", `${f.width}×${f.height} isn't a size Ad Studio generates, so this frame is ignored when building batches.`);
  const real = f.node.absoluteBoundingBox;
  if (real && (Math.abs(real.width - f.width) > 1 || Math.abs(real.height - f.height) > 1)) add("error", "size-mismatch", `The name says ${f.width}x${f.height} but the frame is ${Math.round(real.width)}x${Math.round(real.height)}. Resize the frame or fix the name; exports use the real size.`);
  if (f.node.clipsContent === false) add("warn", "no-clip", "Turn on Clip content so the exported PNG matches what you see in the frame.");

  // Slots.
  const byName = new Map<string, typeof f.slots>();
  for (const s of f.slots) byName.set(s.slot, [...(byName.get(s.slot) ?? []), s]);
  for (const [name, list] of byName) {
    if (list.length > 1) add("error", "duplicate-slot", `#${name} appears ${list.length} times in this frame. Each slot name must be unique so the right layer is edited.`, list[1].nodeId);
    if (!KNOWN.has(name)) add("warn", "unknown-slot", `#${name} isn't a slot Ad Studio knows. Known slots: ${[...KNOWN].map((k) => `#${k}`).join(", ")}.`, list[0].nodeId);
  }
  for (const s of f.slots) {
    if (s.node.visible === false) add("warn", "hidden-slot", `#${s.slot} is hidden. Turn it on or delete it.`, s.nodeId);
    if (TEXT_SLOTS.has(s.slot)) {
      if (s.type !== "TEXT") add("error", "slot-type", `#${s.slot} must be a text layer, but it's a ${s.type.toLowerCase()}.`, s.nodeId);
      else {
        const auto = s.node.style?.textAutoResize;
        if (auto === "NONE" || auto === "TRUNCATE") add("warn", "text-fixed", `#${s.slot} has fixed size, so longer copy won't reflow. Set auto-height or auto-width.`, s.nodeId);
        const size = s.node.style?.fontSize;
        if (size !== undefined && size < 12) add("warn", "text-small", `#${s.slot} is ${size}px, which is hard to read in an ad.`, s.nodeId);
        if (LIMIT_RECOMMENDED.has(s.slot) && s.maxChars === undefined) add("info", "no-limit", `Add a character limit to the name, e.g. #${s.slot}[${s.slot === "cta" ? 20 : 40}], so copy is checked against it.`, s.nodeId);
      }
    }
    if (s.slot === "logo" && s.type !== "INSTANCE" && s.type !== "COMPONENT") add("error", "slot-type", `#logo must be an instance of the Logo component (with a Color variant), not a ${s.type.toLowerCase()}.`, s.nodeId);
    if (IMAGE_SLOTS.has(s.slot)) {
      if (!SHAPE_TYPES.has(s.type)) add("error", "slot-type", `#${s.slot} must be a rectangle, frame or instance that holds an image, not a ${s.type.toLowerCase()}.`, s.nodeId);
      else if (s.type !== "INSTANCE" && s.node.fills && !s.node.fills.some((x) => x.type === "IMAGE" && x.visible !== false)) add("warn", "no-image-fill", `#${s.slot} has no image fill, so it will look empty until one is set.`, s.nodeId);
    }
  }
  for (const r of REQUIRED) if (!byName.has(r)) add("error", "missing-slot", `Missing #${r}. ${r === "headline" ? "Name the main headline text layer #headline." : r === "bg" ? "Name the background layer #bg." : "Name the logo component instance #logo."}`);

  // CTA: the platform adds one on LinkedIn and Meta; Display and newsletter creatives must carry their own.
  const rules = placements.map((k) => placementRule(k));
  const hasCta = byName.has("cta");
  if (rules.length && rules.every((r) => r.uiAddsCta) && hasCta) add("warn", "cta-ui-adds", "The platform adds its own CTA button at this size, so a #cta layer in the image duplicates it. Remove it (or hide it) in this frame.", byName.get("cta")![0].nodeId);
  if (rules.length && rules.every((r) => r.ctaRequired) && !hasCta) add("error", "cta-required", "This size has no platform CTA button, so the creative needs its own. Add a #cta text layer.");

  // Geometry relative to the frame.
  const fb = f.node.absoluteBoundingBox;
  if (fb) {
    const rel = (n: FigmaNode) => (n.absoluteBoundingBox ? { x: (n.absoluteBoundingBox.x - fb.x) / fb.width, y: (n.absoluteBoundingBox.y - fb.y) / fb.height, w: n.absoluteBoundingBox.width / fb.width, h: n.absoluteBoundingBox.height / fb.height } : undefined);
    const safe = placements.map((k) => placementRule(k).safe).find(Boolean);
    for (const s of f.slots) {
      const b = rel(s.node);
      if (!b) continue;
      if (s.slot !== "bg" && (b.x < -0.05 || b.y < -0.05 || b.x + b.w > 1.05 || b.y + b.h > 1.05) && s.slot !== "hero") add("warn", "slot-outside-frame", `#${s.slot} extends outside the frame and will be cropped.`, s.nodeId);
      if (safe && ["headline", "subhead", "stat", "cta", "product", "logo"].includes(s.slot)) {
        const bad = fractionOutside(b, { y0: 0, y1: safe.top }) + fractionOutside(b, { y0: 1 - safe.bottom, y1: 1 });
        if (bad > 0.1) add("warn", "slot-in-safe-zone", `#${s.slot} sits where Stories and Reels UI covers the ad (top ${Math.round(safe.top * 100)}% and bottom ${Math.round(safe.bottom * 100)}%). Move it into the safe area.`, s.nodeId);
      }
    }
  }
  return { nodeId: f.nodeId, name: f.name, width: f.width, height: f.height, placements, slots: [...byName.keys()], issues };
}

/** Checks a Figma page or section against the template conventions Ad Studio relies on. */
export function validateTemplate(root: FigmaNode, opts: { expect?: string[]; allowLegacy?: boolean } = {}): TemplateReport {
  const expect = opts.expect ?? DEFAULT_EXPECTED;
  const { frames, unmatched } = discoverFrames(root, { allowLegacy: opts.allowLegacy });
  const globalIssues: TemplateIssue[] = [];
  if (frames.length === 0) globalIssues.push({ severity: "error", code: "no-frames", message: "No frames named like \"AD | ConceptKey | 1200x1200\" were found under this link. Check the names, and that the link points at a page or section." });
  for (const u of unmatched) globalIssues.push({ severity: "warn", code: "name-not-scheme", nodeId: u.nodeId, message: `"${u.name}" looks like an ad but isn't named "AD | ConceptKey | WxH", so it's ignored.` });

  const concepts: ConceptReport[] = groupByConcept(frames).map((g) => {
    const sizes = g.sizes.map(validateFrame);
    const issues: TemplateIssue[] = [];
    const seen = new Map<string, number>();
    for (const s of sizes) seen.set(`${s.width}x${s.height}`, (seen.get(`${s.width}x${s.height}`) ?? 0) + 1);
    for (const [k, n] of seen) if (n > 1) issues.push({ severity: "error", code: "duplicate-frame", message: `Two frames for ${g.conceptKey} at ${k}. Keep one.` });

    // Every size of a concept should carry the same slots, apart from the CTA rule.
    const all = new Set(sizes.flatMap((s) => s.slots).filter((x) => x !== "cta"));
    for (const s of sizes) {
      const missing = [...all].filter((x) => !s.slots.includes(x) && !REQUIRED.includes(x as (typeof REQUIRED)[number]));
      if (missing.length) s.issues.push({ severity: "warn", code: "inconsistent-slots", nodeId: s.nodeId, message: `Other sizes of ${g.conceptKey} have ${missing.map((m) => `#${m}`).join(", ")}; this one doesn't.` });
    }

    const have = new Set(sizes.map((s) => `${s.width}x${s.height}`));
    const wanted = [...new Set(expect.flatMap((k) => PLACEMENTS.find((p) => p.key === k)?.sizes.map((s) => `${s.w}x${s.h}`) ?? []))];
    const missingSizes = wanted.filter((x) => !have.has(x));
    if (missingSizes.length) issues.push({ severity: "info", code: "missing-sizes", message: `No frame yet for ${missingSizes.join(", ")}. Add them (or leave them out of the batch's placements).` });
    return { conceptKey: g.conceptKey, sizes, missingSizes, issues };
  });

  const all = [...globalIssues, ...concepts.flatMap((c) => [...c.issues, ...c.sizes.flatMap((s) => s.issues)])];
  return { concepts, issues: globalIssues, counts: { errors: all.filter((i) => i.severity === "error").length, warnings: all.filter((i) => i.severity === "warn").length, info: all.filter((i) => i.severity === "info").length } };
}
