"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { addBenchmark, createBatch, deleteBenchmark, importMetricRows, listAds, periodFor, saveChecks, saveGate, saveTaxonomy, setAdStatus, updateAdTags, type ImportSummary } from "@/lib/db/repo";
import { planBatch } from "@/lib/batches/plan";
import { artFor, conceptByKey } from "@/lib/dummy/library";

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

const batchInput = z.object({
  name: z.string().min(3).max(80),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025).max(2030),
  conceptKeys: z.array(z.string()).min(1).max(30),
  placementKeys: z.array(z.string()).min(1).max(12),
  copy: z.record(z.string(), copyInput).optional(),
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
  const { name, month, year, conceptKeys, placementKeys, copy } = parsed.data;
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
  const res = await createBatch(db, {
    name, createdBy: "Jarrod B.", placements: placementKeys, concepts,
    ads: plan.filter((p) => tagsByKey.has(p.conceptKey)).map((p) => ({ conceptKey: p.conceptKey, placement: p.placement, platform: p.platform, width: p.width, height: p.height, name: p.name, tags: { ...tagsByKey.get(p.conceptKey)!, geo: ["US"] } })),
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
