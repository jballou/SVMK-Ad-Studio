import { DEFAULT_GATE, type LearningGate } from "@/lib/scorecard/score";

export interface Taxonomy {
  personas: string[];
  funnels: string[];
  icps: string[];
  geos: string[];
  offers: string[];
}

export const DEFAULT_TAXONOMY: Taxonomy = {
  personas: ["CX", "Marketing", "EX", "IT", "Enterprise"],
  funnels: ["Awareness", "Consideration", "Intent"],
  icps: ["Enterprise", "Mid-market", "SMB"],
  geos: ["US", "UK", "CA", "AU"],
  offers: ["Brand", "Demo", "Free trial", "Report", "Guide", "Webinar"],
};

export const SETTING_KEYS = { gate: "learning_gate", taxonomy: "taxonomy" } as const;
export { DEFAULT_GATE };
export type { LearningGate };
