import { getDb } from "@/db";
import { getAssetRow } from "@/lib/db/repo";
import { storageFor } from "@/lib/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Streams a stored image. Files live in private storage and are only reachable through this route. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const row = await getAssetRow(await getDb(), id);
  const storage = row && storageFor(row.storageKind);
  const obj = row && storage ? await storage.get(row.storageKey) : null;
  if (!row || !obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body as BodyInit, {
    headers: { "Content-Type": row.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" },
  });
}
