import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredObject {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
  size?: number;
}

export interface Storage {
  kind: "blob" | "local";
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
}

/** Vercel Blob, private access: files are only readable through this app's /api/assets route. */
export function blobStorage(): Storage {
  return {
    kind: "blob",
    async put(key, bytes, contentType) {
      const { put } = await import("@vercel/blob");
      await put(key, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
    },
    async get(key) {
      const { get } = await import("@vercel/blob");
      const res = await get(key, { access: "private" });
      if (!res || !res.stream) return null;
      return { body: res.stream, contentType: res.blob.contentType, size: res.blob.size };
    },
    async remove(key) {
      const { del } = await import("@vercel/blob");
      await del(key);
    },
  };
}

/** Local development fallback: files under .data/uploads (git-ignored). */
export function localStorage(dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".data", "uploads")): Storage {
  const file = (key: string) => {
    const resolved = path.join(/*turbopackIgnore: true*/ dir, key);
    // Keys are generated server-side, but never let one escape the directory.
    if (!resolved.startsWith(dir + path.sep)) throw new Error("Invalid storage key");
    return resolved;
  };
  return {
    kind: "local",
    async put(key, bytes, contentType) {
      const f = file(key);
      await mkdir(/*turbopackIgnore: true*/ path.dirname(f), { recursive: true });
      await writeFile(/*turbopackIgnore: true*/ f, bytes);
      await writeFile(/*turbopackIgnore: true*/ `${f}.type`, contentType);
    },
    async get(key) {
      try {
        const f = file(key);
        const [bytes, type] = await Promise.all([readFile(/*turbopackIgnore: true*/ f), readFile(/*turbopackIgnore: true*/ `${f}.type`, "utf8").catch(() => "application/octet-stream")]);
        return { body: new Uint8Array(bytes), contentType: type, size: bytes.byteLength };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const f = file(key);
      await Promise.all([rm(/*turbopackIgnore: true*/ f, { force: true }), rm(/*turbopackIgnore: true*/ `${f}.type`, { force: true })]);
    },
  };
}

export type StorageKind = Storage["kind"] | "none";

/** Blob when a token is configured; local files in development; otherwise no storage (uploads are disabled). */
export function getStorage(): Storage | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStorage();
  if (!process.env.VERCEL) return localStorage();
  return null;
}

/** The driver an existing asset was stored with (a local file can't be read through Blob, and vice versa). */
export function storageFor(kind: string): Storage | null {
  if (kind === "blob") return process.env.BLOB_READ_WRITE_TOKEN ? blobStorage() : null;
  if (kind === "local") return process.env.VERCEL ? null : localStorage();
  return null;
}

export const storageKind = (): StorageKind => getStorage()?.kind ?? "none";
