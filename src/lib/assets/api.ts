import "server-only";
import { AssetError } from "./validate";
import { driveConfigured, driveServiceEmail } from "@/lib/import/drive";
import { figmaConfigured } from "@/lib/import/figma";
import { storageKind } from "@/lib/storage";
import type { Capabilities } from "./types";

export function jsonError(e: unknown): Response {
  if (e instanceof AssetError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Something went wrong. Nothing was saved." }, { status: 500 });
}

export function capabilities(): Capabilities {
  return { storage: storageKind(), drive: driveConfigured(), driveEmail: driveServiceEmail(), figma: figmaConfigured(), persistent: !!process.env.DATABASE_URL || !process.env.VERCEL };
}
