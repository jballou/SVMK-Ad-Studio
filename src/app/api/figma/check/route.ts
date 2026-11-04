import { z } from "zod";
import { jsonError } from "@/lib/assets/api";
import { AssetError } from "@/lib/assets/validate";
import { checkTemplate } from "@/lib/import/figma";

const body = z.object({ url: z.string().min(1).max(600), legacy: z.boolean().optional() });

export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AssetError("Paste a link to the Figma page or section that holds your template.");
    return Response.json(await checkTemplate(parsed.data.url, { allowLegacy: parsed.data.legacy }));
  } catch (e) {
    return jsonError(e);
  }
}
