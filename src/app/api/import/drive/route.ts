import { z } from "zod";
import { getDb } from "@/db";
import { jsonError } from "@/lib/assets/api";
import { ingestImage } from "@/lib/assets/ingest";
import { AssetError } from "@/lib/assets/validate";
import { downloadDrive, parseDriveId, resolveDrive } from "@/lib/import/drive";

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("resolve"), url: z.string().min(1).max(500) }),
  z.object({ mode: z.literal("import"), fileIds: z.array(z.string().regex(/^[\w-]{10,}$/)).min(1).max(10), kind: z.enum(["photo", "product"]) }),
]);

export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AssetError("Paste a Google Drive link to a file or folder.");
    const b = parsed.data;
    if (b.mode === "resolve") {
      const id = parseDriveId(b.url);
      if (!id) throw new AssetError("That doesn't look like a Google Drive link.");
      return Response.json(await resolveDrive(id));
    }
    const db = await getDb();
    const results = [];
    for (const id of b.fileIds) {
      try {
        const { bytes, name } = await downloadDrive(id);
        results.push({ ok: true as const, id, asset: await ingestImage(db, { bytes, name, kind: b.kind, origin: "drive", originRef: { fileId: id } }) });
      } catch (e) {
        results.push({ ok: false as const, id, error: e instanceof AssetError ? e.message : "Couldn't import that file." });
      }
    }
    return Response.json({ results });
  } catch (e) {
    return jsonError(e);
  }
}
