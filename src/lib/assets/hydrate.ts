import type { Db } from "@/db";
import { getAssetRow } from "@/lib/db/repo";
import type { Design, ImageRef } from "@/lib/composition/types";

/** Replaces client-supplied asset details with what's actually stored, and rejects assets that don't exist. */
export async function hydrateAssetRefs(db: Db, design: Design): Promise<Design> {
  const fix = async (ref?: ImageRef): Promise<ImageRef | undefined> => {
    if (!ref || ref.source !== "asset") return ref;
    const row = await getAssetRow(db, ref.id);
    if (!row) throw new Error(`Image "${ref.name}" no longer exists. Choose another.`);
    return { source: "asset", id: row.id, name: row.name, naturalW: row.width, naturalH: row.height, approved: row.approved, origin: row.origin };
  };
  const { photo, product } = design.content.layers;
  return { ...design, content: { ...design.content, layers: { ...design.content.layers, photo: { ...photo, image: await fix(photo.image) }, product: { ...product, image: await fix(product.image) } } } };
}
