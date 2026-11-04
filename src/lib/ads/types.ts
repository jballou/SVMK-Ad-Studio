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
  /** Creative Score dimensions. */
  /** Defaults to "Static" when absent. */
  adType?: string;
  stage?: string;
  geo?: string;
  launchedAt?: string; // ISO date
  pausedAt?: string;
  imageUrl?: string;
  tags: { persona: string[]; funnel?: string; icp?: string[]; geo?: string[]; offer?: string };
  campaign?: string;
  copy?: AdCopy;
  art?: AdArtSpec;
  composition?: Composition;
}

import type { Composition } from "@/lib/composition/types";

export interface AdCopy {
  headline: string; // in-image headline
  intro: string; // platform intro / primary text
  platformHeadline: string; // headline below the creative
  cta: string;
  landing: string;
}

/** Drives the generated creative placeholder (see AdArt). */
export interface AdArtSpec {
  bg: string;
  fg: string;
  accent: string;
  layout: "left" | "center" | "bottom";
}

export type SortKey = "launched" | "name" | "platform" | "status";
export type ViewMode = "grid" | "gallery" | "list";
