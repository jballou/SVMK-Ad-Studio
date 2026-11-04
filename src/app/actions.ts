"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { addBenchmark, createBatch, deleteBenchmark, importMetricRows, listAds, periodFor, saveChecks, saveGate, saveTaxonomy, setAdStatus, setAssetApproved, updateAdTags, type ImportSummary } from "@/lib/db/repo";
import { planBatch } from "@/lib/batches/plan";
import { artFor, conceptByKey, conceptImagery, designForConcept } from "@/lib/dummy/library";
import { resolveComposition } from "@/lib/composition/defaults";
import { hydrateAssetRefs } from "@/lib/assets/hydrate";
import { removeAsset } from "@/lib/assets/ingest";
import { hasErrors, qaComposition } from "@/lib/composition/qa";
import type { Design } from "@/lib/composition/types";
import { THEMES } from "@/lib/dummy/concepts";
import { getAsset, getPreset } from "@/lib/imagery/library";

const today = () => new Date().toLocaleDateString("en-CA");

const statusInput = z.object({ name: z.string().min(1), status: z.enum(["draft", "live", "paused", "retired"]) });

export async function updateAdStatus(input: unknown): Promise<{ ok: boolean }> {
  const { name, status } = statusInput.parse(input);
  const ok = await setAdStatus(await getDb(), name, status, today());
  revalidatePath("/gallery");
  revalidatePath("/scorecards");
  return { ok };
}

const checksInput = z.object({
  name: z.string().min(1),
  checks: z.object({
    campaignActive: z.boolean().optional(),
    landingPageClear: z.boolean().optional(),
    ctaMatch: z.boolean().optional(),
    icpMatch: z.boolean().optional(),
  }),
});

export async function saveManualChecks(input: unknown): Promise<{ ok: boolean }> {
  const { name, checks } = checksInput.parse(input);
  const ok = await saveChecks(await getDb(), name, periodFor(today()), checks);
  revalidatePath("/scorecards");
  return { ok };
}

const rowsInput = z
  .array(
    z.object({
      adName: z.string().min(1),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      spend: z.number().min(0),
      impressions: z.number().int().min(0),
      clicks: z.number().int().min(0),
      conversions: z.number().int().min(0),
    }),
  )
  .max(50_000);

export async function importMetrics(input: unknown): Promise<ImportSummary> {
  const rows = rowsInput.parse(input);
  const res = await importMetricRows(await getDb(), rows, "csv");
  revalidatePath("/scorecards");
  return res;
}

const tagsInput = z.object({
  name: z.string().min(1),
  tags: z.object({
    persona: z.array(z.string().min(1).max(40)).max(8),
    funnel: z.string().max(40).optional(),
    icp: z.array(z.string().min(1).max(40)).max(8).optional(),
    geo: z.array(z.string().min(1).max(40)).max(8).optional(),
    offer: z.string().max(40).optional(),
  }),
});

export async function saveAdTags(input: unknown): Promise<{ ok: boolean }> {
  const { name, tags } = tagsInput.parse(input);
  const ok = await updateAdTags(await getDb(), name, tags);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${name}`);
  revalidatePath("/performance", "layout");
  return { ok };
}

const copyInput = z.object({
  headline: z.string().min(1).max(200),
  platformHeadline: z.string().min(1).max(200),
  intro: z.string().max(400),
  cta: z.string().max(40),
  landing: z.string().max(200),
});

const transformInput = z.object({ x: z.number().min(-0.5).max(1.5), y: z.number().min(-0.5).max(1.5), scale: z.number().min(0.04).max(1.7) });
const kindEnum = z.enum(["background", "photo", "product"]);
const imageRef = z.union([
  z.object({ source: z.literal("gallery"), id: z.string().refine((id) => !!getAsset(id), "Unknown approved image") }),
  z.object({ source: z.literal("asset"), id: z.string().uuid(), name: z.string().max(200), naturalW: z.number().int().min(1).max(30000), naturalH: z.number().int().min(1).max(30000), approved: z.boolean(), origin: z.enum(["upload", "drive", "figma"]) }),
  z.object({ source: z.literal("upload"), name: z.string().max(200), naturalW: z.number().int().min(1).max(30000), naturalH: z.number().int().min(1).max(30000) }),
]);
const layerInput = z.object({ visible: z.boolean(), image: imageRef.optional(), preset: z.string().max(40).refine((p) => !!getPreset(p), "Unknown background preset").optional() });
const designInput = z.object({
  content: z.object({
    order: z.array(kindEnum).length(3).refine((o) => new Set(o).size === 3, "Layers must be unique"),
    layers: z.object({ background: layerInput, photo: layerInput, product: layerInput }),
    text: z.object({
      headline: z.string().max(200), headlineScale: z.number().min(0.5).max(1.6), align: z.enum(["left", "center"]), color: z.enum(["auto", "dark", "light"]),
      scrim: z.boolean(), cta: z.string().max(40), ctaOverride: z.record(z.string(), z.boolean()),
    }),
  }),
  transforms: z.record(z.string(), z.object({ background: transformInput.optional(), photo: transformInput.optional(), product: transformInput.optional() })),
});

const batchInput = z.object({
  name: z.string().min(3).max(80),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025).max(2030),
  conceptKeys: z.array(z.string()).min(1).max(30),
  placementKeys: z.array(z.string()).min(1).max(12),
  copy: z.record(z.string(), copyInput).optional(),
  designs: z.record(z.string(), designInput).optional(),
});

export interface BatchResult {
  ok: boolean;
  batchId?: number;
  created: number;
  skipped: string[];
  names: string[];
  error?: string;
}

/** Re-plans on the server (never trusts the client's list), then creates draft ads and a batch record. */
export async function generateBatch(input: unknown): Promise<BatchResult> {
  const parsed = batchInput.safeParse(input);
  if (!parsed.success) return { ok: false, created: 0, skipped: [], names: [], error: "Check the batch name, month and selections." };
  const { name, month, year, conceptKeys, placementKeys, copy, designs } = parsed.data;
  const db = await getDb();
  const existing = new Set((await listAds(db)).map((a) => a.name));
  const plan = planBatch({ conceptKeys, placementKeys, month, year, existing });
  if (plan.length === 0) return { ok: false, created: 0, skipped: [], names: [], error: "Nothing to generate for those selections." };

  const concepts = conceptKeys.flatMap((key) => {
    const c = conceptByKey(key);
    if (!c) return [];
    const tags = { persona: c.personas, funnel: c.funnel, icp: c.icp, offer: c.offer };
    return [{ key, campaign: c.campaign, tags, art: artFor(c), copy: copy?.[key] ?? { headline: c.headline, platformHeadline: c.platformHeadline, intro: c.intro, cta: c.cta, landing: c.landing } }];
  });
  const tagsByKey = new Map(concepts.map((c) => [c.key, c.tags]));

  // Compose and check every new ad on the server too, so a batch can't skip the editor's QA.
  const compositions = new Map<string, ReturnType<typeof resolveComposition>>();
  const hydrated = new Map<string, Design>();
  const problems: string[] = [];
  for (const p of plan.filter((x) => !x.exists)) {
    const seed = conceptByKey(p.conceptKey);
    if (!seed) continue;
    const supports = conceptImagery(seed);
    const given = designs?.[p.conceptKey];
    if (given && !hydrated.has(p.conceptKey)) {
      try {
        hydrated.set(p.conceptKey, await hydrateAssetRefs(db, { ...given, supports }));
      } catch (e) {
        return { ok: false, created: 0, skipped: [], names: [], error: e instanceof Error ? e.message : "An image in this design is no longer available." };
      }
    }
    const design: Design = hydrated.get(p.conceptKey) ?? designForConcept(seed, copy?.[p.conceptKey]?.headline);
    const comp = resolveComposition(design, p.width, p.height, p.placement);
    compositions.set(p.name, comp);
    const issues = qaComposition(comp, { placementKey: p.placement, width: p.width, height: p.height, supports, themeBg: THEMES[seed.theme].bg });
    if (hasErrors(issues)) problems.push(`${p.conceptKey} ${p.width}×${p.height}: ${issues.find((i) => i.severity === "error")!.message}`);
  }
  if (problems.length) return { ok: false, created: 0, skipped: [], names: [], error: `Fix these before generating: ${problems.slice(0, 3).join(" ")}${problems.length > 3 ? ` (+${problems.length - 3} more)` : ""}` };

  const res = await createBatch(db, {
    name, createdBy: "Jarrod B.", placements: placementKeys, concepts,
    ads: plan.filter((p) => tagsByKey.has(p.conceptKey)).map((p) => ({ conceptKey: p.conceptKey, placement: p.placement, platform: p.platform, width: p.width, height: p.height, name: p.name, tags: { ...tagsByKey.get(p.conceptKey)!, geo: ["US"] }, composition: compositions.get(p.name) })),
  });
  revalidatePath("/gallery");
  revalidatePath("/batches");
  revalidatePath("/");
  return { ok: true, batchId: res.batchId, created: res.created, skipped: res.skipped, names: plan.map((p) => p.name) };
}

const gateInput = z.object({ minDays: z.number().int().min(1).max(90), minImpressions: z.number().int().min(100).max(10_000_000) });

export async function saveLearningGate(input: unknown): Promise<{ ok: boolean }> {
  const parsed = gateInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  await saveGate(await getDb(), parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

const list = z.array(z.string().trim().min(1).max(40)).max(30);
const taxonomyInput = z.object({ personas: list, funnels: list, icps: list, geos: list, offers: list });

export async function saveTaxonomySettings(input: unknown): Promise<{ ok: boolean }> {
  const parsed = taxonomyInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  await saveTaxonomy(await getDb(), parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

const benchmarkInput = z.object({
  platform: z.enum(["linkedin", "meta", "display", "newsletter"]),
  funnel: z.enum(["Awareness", "Consideration", "Intent"]),
  metric: z.enum(["ctr", "cpc", "cvr"]),
  value: z.number().positive().max(100_000),
  tier: z.enum(["primary", "secondary"]),
  source: z.string().trim().min(1).max(80),
});

export async function createBenchmark(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = benchmarkInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the values and try again." };
  const b = parsed.data;
  await addBenchmark(await getDb(), { ...b, direction: b.metric === "cpc" ? "lower" : "higher", asOf: new Date().toLocaleDateString("en-CA") });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeBenchmark(id: unknown): Promise<{ ok: boolean }> {
  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { ok: false };
  const ok = await deleteBenchmark(await getDb(), parsed.data);
  revalidatePath("/", "layout");
  return { ok };
}

const assetId = z.string().uuid();

export async function setAssetApprovedAction(id: unknown, approved: unknown): Promise<{ ok: boolean }> {
  const a = assetId.safeParse(id);
  const b = z.boolean().safeParse(approved);
  if (!a.success || !b.success) return { ok: false };
  const ok = await setAssetApproved(await getDb(), a.data, b.data);
  revalidatePath("/library");
  return { ok };
}

export async function deleteAssetAction(id: unknown): Promise<{ ok: boolean }> {
  const a = assetId.safeParse(id);
  if (!a.success) return { ok: false };
  const ok = await removeAsset(await getDb(), a.data);
  revalidatePath("/library");
  return { ok };
}
