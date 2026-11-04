import { z } from "zod";
import { getDb } from "@/db";
import { jsonError } from "@/lib/assets/api";
import { ingestImage } from "@/lib/assets/ingest";
import { AssetError } from "@/lib/assets/validate";
import { downloadFigma, resolveFigma } from "@/lib/import/figma";

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("resolve"), url: z.string().min(1).max(600) }),
  z.object({ mode: z.literal("import"), url: z.string().min(1).max(600), kind: z.enum(["photo", "product"]) }),
]);

export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AssetError("Paste a Figma link to a frame or layer.");
    const b = parsed.data;
    if (b.mode === "resolve") return Response.json(await resolveFigma(b.url));
    const { bytes, target, scale } = await downloadFigma(b.url);
    const asset = await ingestImage(await getDb(), { bytes, name: `${target.name}.png`, kind: b.kind, origin: "figma", originRef: { fileKey: target.fileKey, nodeId: target.nodeId, scale: String(scale) } });
    return Response.json({ asset }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
