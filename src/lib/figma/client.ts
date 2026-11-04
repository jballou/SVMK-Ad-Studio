// Thin Figma REST client. Server-side only: the token never reaches the browser.
const BASE = "https://api.figma.com/v1";

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: FigmaNode[];
  /** Present on nodes returned by /files/:key/nodes. */
  fills?: { type: string; visible?: boolean }[];
  clipsContent?: boolean;
  characters?: string;
  style?: { fontSize?: number; textAutoResize?: string };
}

export class FigmaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function figmaGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new FigmaError(res.status, `Figma ${res.status} on ${path.split("?")[0]}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Accepts a figma.com URL or a bare key; returns file key and optional node id (colon form). */
export function parseFigmaUrl(input: string): { fileKey: string; nodeId?: string } {
  const m = /figma\.com\/(?:design|file)\/([0-9a-zA-Z]+)/.exec(input);
  if (!m) return { fileKey: input };
  const node = /[?&]node-id=([\d]+[-:][\d]+)/.exec(input)?.[1];
  return { fileKey: m[1], nodeId: node?.replace("-", ":") };
}

/** Fetch the subtree under one node (a page or section) rather than the whole file. */
export async function getNodeTree(fileKey: string, nodeId: string, token: string): Promise<FigmaNode> {
  const data = await figmaGet<{ nodes: Record<string, { document: FigmaNode } | null> }>(
    `/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
    token,
  );
  const n = data.nodes[nodeId];
  if (!n) throw new FigmaError(404, `Node ${nodeId} not found in ${fileKey}`);
  return n.document;
}

/** Render nodes to PNG. Returned URLs are short-lived (copy them to storage). Batches of 40 ids. */
export async function exportPngs(fileKey: string, nodeIds: string[], token: string, scale = 1): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < nodeIds.length; i += 40) {
    const batch = nodeIds.slice(i, i + 40);
    const data = await figmaGet<{ images: Record<string, string | null> }>(
      `/images/${fileKey}?ids=${encodeURIComponent(batch.join(","))}&format=png&scale=${scale}`,
      token,
    );
    for (const [id, url] of Object.entries(data.images)) if (url) out[id] = url;
  }
  return out;
}
