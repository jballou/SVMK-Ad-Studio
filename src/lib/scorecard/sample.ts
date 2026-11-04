import type { Totals } from "@/lib/metrics/csv";
import type { Benchmark } from "./build";

// SAMPLE ONLY: placeholder numbers to exercise the UI. Replace with the team's real benchmarks.
export const SAMPLE_BENCHMARKS: Benchmark[] = [
  { platform: "linkedin", funnel: "Awareness", metric: "ctr", value: 0.45, direction: "higher", tier: "primary", source: "sample" },
  { platform: "linkedin", funnel: "Awareness", metric: "cpc", value: 8, direction: "lower", tier: "secondary", source: "sample" },
  { platform: "meta", funnel: "Awareness", metric: "ctr", value: 0.8, direction: "higher", tier: "primary", source: "sample" },
  { platform: "meta", funnel: "Awareness", metric: "cpm", value: 12, direction: "lower", tier: "secondary", source: "sample" },
  { platform: "display", funnel: "Awareness", metric: "ctr", value: 0.1, direction: "higher", tier: "primary", source: "sample" },
];

const t = (spend: number, impressions: number, clicks: number, conversions = 0): Totals => ({ spend, impressions, clicks, conversions });

// Keyed by ad name. Sample ads without an entry have no data yet.
export const SAMPLE_TOTALS: Record<string, Totals> = {
  "HumansMatter082026_1200x1200": t(9000, 400_000, 2200, 40),
  "HumansMatter082026_1200x628": t(7000, 380_000, 1400, 22),
  "HumansMatter082026_1080x1350": t(3000, 250_000, 2300, 30),
  "JustBeginning082026_1080x1080": t(2500, 200_000, 1900, 25),
  "JustBeginning082026_1080x1920": t(2400, 210_000, 1000, 9),
  "GuessingKnowing082026_1080x1350": t(1800, 90_000, 500, 4),
  "NotSurveys082026_1200x1200": t(8000, 360_000, 2400, 38),
  "NotSurveys082026_300x250": t(1500, 1_500_000, 2100, 10),
  "DataDecisions082026_728x90": t(900, 900_000, 600, 3),
  "GetInsights072025_1200x628": t(6000, 300_000, 1500, 20),
  "EasySet072025_720x900": t(5000, 280_000, 900, 11),
  "FreshLaunch102026_1200x1200": t(300, 25_000, 150, 1),
};
