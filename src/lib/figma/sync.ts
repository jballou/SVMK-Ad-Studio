import { exportPngs, getNodeTree, parseFigmaUrl } from "./client";
import { discoverFrames, groupByConcept, type ConceptGroup, type DiscoveryResult } from "./discover";

export interface SyncPlan extends DiscoveryResult {
  fileKey: string;
  concepts: ConceptGroup[];
}

/** Read-only: discover ad frames under the node in `source` (figma.com URL with node-id). */
export async function planSync(source: string, token: string, opts: { allowLegacy?: boolean } = {}): Promise<SyncPlan> {
  const { fileKey, nodeId } = parseFigmaUrl(source);
  if (!nodeId) throw new Error("Figma URL must include a node-id (a page or section) to scope the sync");
  const root = await getNodeTree(fileKey, nodeId, token);
  const result = discoverFrames(root, opts);
  return { fileKey, ...result, concepts: groupByConcept(result.frames) };
}

/** Render every discovered frame to PNG; returns nodeId -> temporary URL. */
export async function renderPlan(plan: SyncPlan, token: string, scale = 1) {
  return exportPngs(plan.fileKey, plan.frames.map((f) => f.nodeId), token, scale);
}
