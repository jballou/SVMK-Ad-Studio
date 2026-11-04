import "server-only";
import { randomUUID } from "node:crypto";
import type { Db } from "@/db";
import { deleteAssetRow, insertAsset, type AssetRow } from "@/lib/db/repo";
import { getStorage, storageFor } from "@/lib/storage";
import { AssetError, cleanName, inspectImage } from "./validate";
import { assetUrl, type AssetDto, type AssetOrigin } from "./types";

export const toDto = (r: AssetRow): AssetDto => ({
  id: r.id, kind: r.kind, name: r.name, origin: r.origin, width: r.width, height: r.height, bytes: r.bytes, approved: r.approved, createdAt: r.createdAt.toISOString(), url: assetUrl(r.id),
});

/** Validates the bytes, stores them, and records the asset. Used by uploads and by the Drive and Figma imports. */
export async function ingestImage(db: Db, input: { bytes: Uint8Array; name: string; kind: "photo" | "product"; origin: AssetOrigin; originRef?: Record<string, string>; createdBy?: string }): Promise<AssetDto> {
  const storage = getStorage();
  if (!storage) throw new AssetError("Image storage isn't connected yet. Add a Vercel Blob store to this project (see the README).", 503);
  const info = inspectImage(input.bytes);
  const id = randomUUID();
  const key = `assets/${id}.${info.ext}`;
  await storage.put(key, input.bytes, info.mime);
  try {
    const row = await insertAsset(db, {
      id, kind: input.kind, name: cleanName(input.name), origin: input.origin, originRef: input.originRef ?? null,
      storageKey: key, storageKind: storage.kind, contentType: info.mime, bytes: info.bytes, width: info.width, height: info.height,
      approved: false, createdBy: input.createdBy ?? "Jarrod B.",
    });
    return toDto(row);
  } catch (e) {
    await storage.remove(key).catch(() => {});
    throw e;
  }
}

export async function removeAsset(db: Db, id: string): Promise<boolean> {
  const row = await deleteAssetRow(db, id);
  if (!row) return false;
  await storageFor(row.storageKind)?.remove(row.storageKey).catch(() => {});
  return true;
}
