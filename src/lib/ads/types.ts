export type AdStatus = "draft" | "live" | "paused" | "retired";
export const STATUSES: AdStatus[] = ["draft", "live", "paused", "retired"];

export interface AdRecord {
  id: string;
  name: string; // {ConceptKey}{MMYYYY}_{W}x{H}
  conceptKey: string;
  platform: "linkedin" | "meta" | "display" | "newsletter";
  placement: string;
  width: number;
  height: number;
  status: AdStatus;
  launchedAt?: string; // ISO date
  pausedAt?: string;
  imageUrl?: string;
  tags: { persona: string[]; funnel?: string; icp?: string[]; geo?: string[] };
}

export type SortKey = "launched" | "name" | "platform" | "status";
export type ViewMode = "grid" | "gallery" | "list";
