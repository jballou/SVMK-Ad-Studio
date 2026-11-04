import { getDb } from "@/db";
import { capabilities, jsonError } from "@/lib/assets/api";
import { ingestImage, toDto } from "@/lib/assets/ingest";
import { AssetError, MAX_BYTES } from "@/lib/assets/validate";
import { listAssetRows } from "@/lib/db/repo";

const kinds = new Set(["photo", "product"]);

export async function GET(req: Request) {
  try {
    const kind = new URL(req.url).searchParams.get("kind");
    const rows = await listAssetRows(await getDb(), kind && kinds.has(kind) ? (kind as "photo" | "product") : undefined);
    return Response.json({ items: rows.map(toDto), capabilities: capabilities() });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES + 64 * 1024) throw new AssetError(`That file is over the ${MAX_BYTES / 1e6 | 0} MB limit. Export a smaller version.`, 413);
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");
    if (!(file instanceof File)) throw new AssetError("Choose a file to upload.");
    if (!kinds.has(kind)) throw new AssetError("Say whether this is a photo or a product image.");
    const asset = await ingestImage(await getDb(), { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, kind: kind as "photo" | "product", origin: "upload" });
    return Response.json({ asset }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
