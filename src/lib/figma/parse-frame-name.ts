// Frame naming scheme: `AD | {ConceptKey} | {W}x{H}`, e.g. `AD | YourBrand | 1200x1200`.
export interface ParsedFrame {
  conceptKey: string;
  width: number;
  height: number;
}

const FRAME_RE = /^AD\s*\|\s*([A-Za-z0-9]+)\s*\|\s*(\d+)x(\d+)$/;

export function parseFrameName(name: string): ParsedFrame | null {
  const m = FRAME_RE.exec(name.trim());
  if (!m) return null;
  return { conceptKey: m[1], width: Number(m[2]), height: Number(m[3]) };
}

// Slot layers are prefixed `#`; optional `[n]` suffix is a max character count.
export interface ParsedSlot {
  slot: string;
  maxChars?: number;
}

const SLOT_RE = /^#([a-z][a-z0-9]*)(?:\[(\d+)\])?$/;

export function parseSlotName(name: string): ParsedSlot | null {
  const m = SLOT_RE.exec(name.trim());
  if (!m) return null;
  return { slot: m[1], maxChars: m[2] ? Number(m[2]) : undefined };
}

// Platform ad name / export filename: `{ConceptKey}{MMYYYY}_{W}x{H}`.
export function adName(conceptKey: string, launch: { month: number; year: number }, w: number, h: number): string {
  const mm = String(launch.month).padStart(2, "0");
  return `${conceptKey}${mm}${launch.year}_${w}x${h}`;
}

export function parseAdName(name: string): { conceptKey: string; month: number; year: number; width: number; height: number } | null {
  const m = /^([A-Za-z0-9]*?[A-Za-z])(\d{2})(\d{4})_(\d+)x(\d+)$/.exec(name.trim());
  if (!m) return null;
  return { conceptKey: m[1], month: Number(m[2]), year: Number(m[3]), width: Number(m[4]), height: Number(m[5]) };
}
