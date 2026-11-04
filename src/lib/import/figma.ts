import "server-only";
import { exportPngs, FigmaError, getNodeTree, parseFigmaUrl } from "@/lib/figma/client";
import { AssetError, MAX_BYTES } from "@/lib/assets/validate";
import { validateTemplate, type TemplateReport } from "@/lib/figma/validate-template";

export const figmaConfigured = () => !!process.env.FIGMA_TOKEN;

const ALLOWED_HOSTS = /(^|\.)(amazonaws\.com|figma\.com)$/;

/** Export scale: sharp (2x) for small frames, capped so the longest side stays near 2400px. */
export function exportScale(width: number, height: number): number {
  const longest = Math.max(width, height, 1);
  return Math.round(Math.min(2, Math.max(0.1, 2400 / longest)) * 100) / 100;
}

function token(): string {
  const t = process.env.FIGMA_TOKEN;
  if (!t) throw new AssetError("Figma isn't connected yet. Add FIGMA_TOKEN (see the README).", 503);
  return t;
}

function friendly(e: unknown): never {
  if (e instanceof AssetError) throw e;
  if (e instanceof FigmaError) {
    if (e.status === 403) throw new AssetError("Figma refused access. The token needs read access to that file.", 403);
    if (e.status === 404) throw new AssetError("Couldn't find that node. Check the link includes a node-id.", 404);
    if (e.status === 429) throw new AssetError("Figma is rate limiting requests. Try again in a minute.", 429);
  }
  throw new AssetError("Figma didn't respond. Try again in a moment.", 502);
}

export interface FigmaTarget {
  fileKey: string;
  nodeId: string;
  name: string;
  type: string;
  width: number;
  height: number;
}

export async function resolveFigma(url: string): Promise<FigmaTarget & { previewUrl?: string }> {
  const t = token();
  const { fileKey, nodeId } = parseFigmaUrl(url);
  if (!/^[0-9a-zA-Z]{10,}$/.test(fileKey)) throw new AssetError("That doesn't look like a Figma link.");
  if (!nodeId) throw new AssetError("The link needs a node-id: in Figma, select the frame or layer and copy its link.");
  try {
    const node = await getNodeTree(fileKey, nodeId, t);
    const b = node.absoluteBoundingBox;
    if (!b) throw new AssetError("That layer can't be exported as an image.");
    const urls = await exportPngs(fileKey, [nodeId], t, Math.min(1, exportScale(b.width, b.height)));
    return { fileKey, nodeId, name: node.name, type: node.type, width: Math.round(b.width), height: Math.round(b.height), previewUrl: urls[nodeId] };
  } catch (e) {
    friendly(e);
  }
}

async function download(url: string): Promise<Uint8Array> {
  const u = new URL(url);
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.test(u.hostname)) throw new AssetError("Unexpected image host from Figma.", 502);
  const res = await fetch(u);
  if (!res.ok) throw new AssetError("Couldn't download the rendered image from Figma.", 502);
  return new Uint8Array(await res.arrayBuffer());
}

/** Renders the node to PNG and downloads it, retrying once at half the scale if it exceeds the size limit. */
export async function downloadFigma(url: string): Promise<{ bytes: Uint8Array; target: FigmaTarget; scale: number }> {
  const t = token();
  const target = await resolveFigma(url).then(({ previewUrl, ...rest }) => (void previewUrl, rest));
  let scale = exportScale(target.width, target.height);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const urls = await exportPngs(target.fileKey, [target.nodeId], t, scale);
      const src = urls[target.nodeId];
      if (!src) throw new AssetError("Figma couldn't render that layer.", 502);
      const bytes = await download(src);
      if (bytes.byteLength <= MAX_BYTES || attempt === 1) return { bytes, target, scale };
      scale = Math.max(0.1, Math.round((scale / 2) * 100) / 100);
    }
  } catch (e) {
    friendly(e);
  }
  throw new AssetError("Figma couldn't render that layer.", 502);
}

/** Fetches a Figma page or section and checks it against the template conventions. */
export async function checkTemplate(url: string, opts: { allowLegacy?: boolean } = {}): Promise<TemplateReport & { fileKey: string; nodeName: string }> {
  const t = token();
  const { fileKey, nodeId } = parseFigmaUrl(url);
  if (!/^[0-9a-zA-Z]{10,}$/.test(fileKey)) throw new AssetError("That doesn't look like a Figma link.");
  if (!nodeId) throw new AssetError("The link needs a node-id. Select the page's section or frame in Figma and copy its link.");
  try {
    const root = await getNodeTree(fileKey, nodeId, t);
    return { ...validateTemplate(root, opts), fileKey, nodeName: root.name };
  } catch (e) {
    friendly(e);
  }
}
