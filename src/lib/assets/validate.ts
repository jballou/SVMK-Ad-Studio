import { imageSize } from "image-size";

export const MAX_BYTES = 4 * 1024 * 1024; // keeps uploads under the 4.5 MB serverless request limit
export const MAX_DIMENSION = 8000;
export const MIN_DIMENSION = 64;

export type AllowedType = "png" | "jpg" | "webp";
const TYPES: Record<AllowedType, { mime: string; ext: string }> = {
  png: { mime: "image/png", ext: "png" },
  jpg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
};

export interface ImageInfo {
  mime: string;
  ext: string;
  width: number;
  height: number;
  bytes: number;
}

export class AssetError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Identifies an image from its bytes (never from the filename or declared type) and enforces size limits. */
export function inspectImage(bytes: Uint8Array): ImageInfo {
  if (bytes.byteLength === 0) throw new AssetError("That file is empty.");
  if (bytes.byteLength > MAX_BYTES) throw new AssetError(`That file is ${(bytes.byteLength / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6 | 0} MB. Export a smaller version.`, 413);
  let size: ReturnType<typeof imageSize>;
  try {
    size = imageSize(bytes);
  } catch {
    throw new AssetError("That file isn't a readable image. Use a PNG, JPG or WebP.");
  }
  const t = size.type as string;
  if (!(t in TYPES)) throw new AssetError(`${t ? t.toUpperCase() : "That"} files aren't supported. Use a PNG, JPG or WebP.`, 415);
  if (!size.width || !size.height) throw new AssetError("Couldn't read the image's dimensions.");
  if (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) throw new AssetError(`That image is ${size.width}×${size.height}px; the maximum is ${MAX_DIMENSION}px on either side.`, 413);
  if (size.width < MIN_DIMENSION || size.height < MIN_DIMENSION) throw new AssetError(`That image is only ${size.width}×${size.height}px; it needs to be at least ${MIN_DIMENSION}px.`);
  const { mime, ext } = TYPES[t as AllowedType];
  return { mime, ext, width: size.width, height: size.height, bytes: bytes.byteLength };
}

/** A safe display name derived from an untrusted filename. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "image";
  const cleaned = base.replace(/[^\p{L}\p{N}._ -]+/gu, "").trim().slice(0, 120);
  return cleaned || "image";
}
