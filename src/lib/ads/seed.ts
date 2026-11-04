import type { AdRecord } from "./types";

// Sample data until the database is connected. Names mirror the scorecard deck's style.
const mk = (
  conceptKey: string, mmyyyy: string, w: number, h: number, platform: AdRecord["platform"], placement: string,
  status: AdRecord["status"], launchedAt: string | undefined, persona: string[], funnel: string,
): AdRecord => ({
  id: `${conceptKey}${mmyyyy}_${w}x${h}`,
  name: `${conceptKey}${mmyyyy}_${w}x${h}`,
  conceptKey, platform, placement, width: w, height: h, status, launchedAt,
  tags: { persona, funnel, geo: ["US"] },
});

export const SEED_ADS: AdRecord[] = [
  mk("HumansMatter", "082026", 1200, 1200, "linkedin", "linkedin-single-image", "live", "2026-08-12", ["CX"], "Awareness"),
  mk("HumansMatter", "082026", 1200, 628, "linkedin", "linkedin-single-image", "live", "2026-08-12", ["CX"], "Awareness"),
  mk("HumansMatter", "082026", 1080, 1350, "meta", "instagram-feed", "paused", "2026-08-12", ["CX"], "Awareness"),
  mk("JustBeginning", "082026", 1080, 1080, "meta", "facebook-feed", "live", "2026-08-19", ["Marketing"], "Awareness"),
  mk("JustBeginning", "082026", 1080, 1920, "meta", "meta-stories-reels", "live", "2026-08-19", ["Marketing"], "Awareness"),
  mk("GuessingKnowing", "082026", 1080, 1350, "meta", "threads-feed", "retired", "2026-08-05", ["Marketing", "CX"], "Awareness"),
  mk("NotSurveys", "082026", 1200, 1200, "linkedin", "linkedin-single-image", "live", "2026-08-12", ["IT"], "Awareness"),
  mk("NotSurveys", "082026", 300, 250, "display", "display-standard", "live", "2026-08-12", ["IT"], "Awareness"),
  mk("DataDecisions", "082026", 728, 90, "display", "display-standard", "paused", "2026-08-01", ["IT"], "Awareness"),
  mk("GetInsights", "072025", 1200, 628, "linkedin", "linkedin-single-image", "retired", "2025-07-08", ["Enterprise"], "Intent"),
  mk("EasySet", "072025", 720, 900, "linkedin", "linkedin-single-image", "retired", "2025-07-08", ["Enterprise"], "Intent"),
  mk("TakeBrand", "072025", 1200, 1200, "linkedin", "linkedin-single-image", "draft", undefined, ["Enterprise", "Marketing"], "Intent"),
];
