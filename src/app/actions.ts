"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { importMetricRows, periodFor, saveChecks, setAdStatus, type ImportSummary } from "@/lib/db/repo";

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
