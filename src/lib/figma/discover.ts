import type { FigmaNode } from "./client";
import { parseFrameName, parseSlotName, type ParsedSlot } from "./parse-frame-name";

export interface DiscoveredFrame {
  nodeId: string;
  name: string;
  conceptKey: string;
  width: number;
  height: number;
  slots: (ParsedSlot & { nodeId: string; type: string })[];
  /** True when matched via the legacy-name fallback rather than the `AD | Key | WxH` scheme. */
  legacy: boolean;
}

export interface DiscoveryResult {
  frames: DiscoveredFrame[];
  /** Frames sized like ads but not matching either name pattern (flag for renaming). */
  unmatched: { nodeId: string; name: string }[];
}

// Legacy: `LI Marketing Consideration Ad #1_1200x1200` -> key `LIMarketingConsiderationAd1`.
function parseLegacy(name: string) {
  const m = /^(.+?)_(\d+)x(\d+)$/.exec(name.trim());
  if (!m) return null;
  const conceptKey = m[1].replace(/[^A-Za-z0-9]/g, "");
  return conceptKey ? { conceptKey, width: Number(m[2]), height: Number(m[3]) } : null;
}

function collectSlots(node: FigmaNode, out: DiscoveredFrame["slots"]) {
  for (const c of node.children ?? []) {
    const slot = parseSlotName(c.name);
    if (slot) out.push({ ...slot, nodeId: c.id, type: c.type });
    collectSlots(c, out);
  }
}

/** Walk a node tree. Ad frames are not nested inside each other, so we stop descending at a match. */
export function discoverFrames(root: FigmaNode, opts: { allowLegacy?: boolean } = {}): DiscoveryResult {
  const frames: DiscoveredFrame[] = [];
  const unmatched: DiscoveryResult["unmatched"] = [];

  const visit = (node: FigmaNode) => {
    if (node.visible === false) return;
    if (node.type === "FRAME") {
      const strict = parseFrameName(node.name);
      const legacy = !strict && opts.allowLegacy ? parseLegacy(node.name) : null;
      const p = strict ?? legacy;
      if (p) {
        const slots: DiscoveredFrame["slots"] = [];
        collectSlots(node, slots);
        frames.push({ nodeId: node.id, name: node.name, ...p, slots, legacy: !strict });
        return;
      }
      const b = node.absoluteBoundingBox;
      if (b && /\d+x\d+$/.test(node.name)) unmatched.push({ nodeId: node.id, name: node.name });
    }
    node.children?.forEach(visit);
  };
  visit(root);
  return { frames, unmatched };
}

export interface ConceptGroup {
  conceptKey: string;
  sizes: DiscoveredFrame[];
}

export function groupByConcept(frames: DiscoveredFrame[]): ConceptGroup[] {
  const map = new Map<string, DiscoveredFrame[]>();
  for (const f of frames) map.set(f.conceptKey, [...(map.get(f.conceptKey) ?? []), f]);
  return [...map].map(([conceptKey, sizes]) => ({ conceptKey, sizes }));
}
