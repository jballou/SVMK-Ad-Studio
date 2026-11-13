import { z } from "zod";
import type { TemplateSpec } from "./spec";

const num = z.number().finite();
const box = z.object({ x: num, y: num, w: num, h: num });
const role = z.enum(["headline", "subhead", "stat", "body", "cta", "logo", "partner-logos", "image", "background-image", "product", "decoration"]);
const issue = z.object({ severity: z.enum(["error", "warn", "info"]), code: z.string().max(60), message: z.string().max(400), nodeId: z.string().max(40).optional() });

const element = z.object({
  id: z.string().max(40), name: z.string().max(200), role, source: z.enum(["named", "inferred"]), box, px: box, z: num.int().min(0), locked: z.boolean(),
  text: z.object({
    chars: num.int().min(0), lines: num.int().min(1), font: z.object({ family: z.string().optional(), size: num, weight: num.optional(), lineHeight: num.optional(), letterSpacing: num.optional(), textCase: z.string().optional() }),
    align: z.enum(["left", "center", "right", "justify"]), color: z.string().max(9).optional(), autoResize: z.string().optional(), capacity: num.int().min(0), maxChars: num.int().min(1).max(2000),
  }).optional(),
  image: z.object({ fit: z.enum(["fill", "fit", "crop", "tile", "unknown"]), aspect: num, coversFrame: z.boolean() }).optional(),
  logo: z.object({ variant: z.enum(["green", "white", "green-900"]) }).optional(),
  cta: z.object({ label: z.string().max(80), fill: z.string().optional(), textColor: z.string().optional(), radius: num.optional() }).optional(),
  count: num.int().optional(),
});

const frame = z.object({
  nodeId: z.string().max(40), name: z.string().max(200), conceptKey: z.string().max(120), width: num.int().min(1).max(20000), height: num.int().min(1).max(20000),
  background: z.object({ color: z.string().max(9).optional(), image: z.boolean() }),
  elements: z.array(element).max(200),
  layout: z.object({ margins: z.object({ top: num, right: num, bottom: num, left: num }), textGaps: z.array(num).max(50), autoLayout: z.boolean() }),
  placements: z.array(z.string().max(60)).max(30), decorationCount: num.int().min(0), issues: z.array(issue).max(100),
});

const spec = z.object({
  version: z.literal(1), source: z.object({ fileKey: z.string().max(60), nodeId: z.string().max(40).optional() }),
  frames: z.array(frame).min(1).max(12), unmatched: z.array(z.object({ nodeId: z.string(), name: z.string() })).max(50),
  limits: z.record(z.string(), num), issues: z.array(issue).max(100),
});

/** The spec comes back from the browser after the designer edited it, so it is checked like any other input. */
export function validateSpecInput(input: unknown): { ok: true; spec: TemplateSpec } | { ok: false; error: string } {
  const r = spec.safeParse(input);
  if (!r.success) return { ok: false, error: `The template spec isn't valid (${r.error.issues[0]?.path.join(".") || "root"}: ${r.error.issues[0]?.message}). Reload the link and try again.` };
  return { ok: true, spec: r.data as TemplateSpec };
}
