import { getAsset } from "@/lib/imagery/library";

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const asset = getAsset(file.replace(/\.svg$/, ""));
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(asset.svg(), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
}
