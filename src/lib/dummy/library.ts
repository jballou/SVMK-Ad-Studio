import { CONCEPTS, THEMES, type ConceptSeed } from "./concepts";

export interface TemplateFile {
  id: string;
  name: string;
  fileKey: string;
  campaign: string;
  lastSynced: string;
  concepts: string[];
  frameCount: number;
  status: "synced" | "stale";
}

const STALE = new Set(["EX Awareness"]);

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Figma template files, one per campaign. Frames per concept follow the `AD | Concept | WxH` convention. */
export const TEMPLATE_FILES: TemplateFile[] = [...new Set(CONCEPTS.map((c) => c.campaign))].map((campaign, i) => {
  const keys = CONCEPTS.filter((c) => c.campaign === campaign).map((c) => c.key);
  return {
    id: slug(campaign),
    name: `${campaign} Ads`,
    fileKey: i === 0 ? "G2S2291KKTHEGJGt4TNVg3" : `FIGMA${String(i).padStart(2, "0")}${slug(campaign).replace(/-/g, "").slice(0, 14).padEnd(14, "x")}`,
    campaign,
    lastSynced: STALE.has(campaign) ? "2026-09-14" : `2026-10-${String(30 - i).padStart(2, "0")}`,
    concepts: keys,
    frameCount: keys.length * 9,
    status: STALE.has(campaign) ? "stale" : "synced",
  };
});

export function conceptByKey(key: string): ConceptSeed | undefined {
  return CONCEPTS.find((c) => c.key === key);
}

export function artFor(c: ConceptSeed) {
  return { ...THEMES[c.theme], layout: c.layout };
}

export interface DeckRowData {
  /** Ad name without the launch date, e.g. "YourBrand". */
  adBase: string;
  funnel: string;
  headline: string; // in-image copy
  platformHeadline: string;
  intro: string;
  cta: string;
  landing: string;
}

export interface CopyDeck {
  id: string;
  name: string;
  sheetId: string;
  tab: string;
  linkedBy: string;
  syncedAt: string;
  rows: DeckRowData[];
}

/** One copy deck per campaign, mirroring the "Phase 2 SCS Ad Copy" sheet layout. */
export const COPY_DECKS: CopyDeck[] = TEMPLATE_FILES.map((t, i) => {
  const rows: DeckRowData[] = CONCEPTS.filter((c) => c.campaign === t.campaign).map((c) => ({
    adBase: c.key, funnel: c.funnel, headline: c.headline, platformHeadline: c.platformHeadline, intro: c.intro, cta: c.cta, landing: c.landing,
  }));
  if (t.campaign === "SA Campaign Phase 2") {
    // Deliberately flawed rows so validation has something to show: one missing headline, one over-long intro,
    // and one row that matches no Figma concept.
    for (const r of rows) {
      if (r.adBase === "TakeBrand") r.platformHeadline = "";
      if (r.adBase === "EasySet") r.intro += " Level up your feedback game today with a platform your whole team can start using in minutes.";
    }
    rows.push({ adBase: "GetInsightsAlt", funnel: "Intent", headline: "Unlock more ROI with real-time insights.", platformHeadline: "Get the insights you need to maximize ROI across every team in your organization today", intro: "Get real-time, meaningful insights with SurveyMonkey's AI-powered, secure platform.", cta: "Book a demo", landing: "/welcome/contact-sales/" });
  }
  return {
    id: `deck-${t.id}`,
    name: `${t.campaign} Ad Copy`,
    sheetId: `1${slug(t.campaign).replace(/-/g, "").slice(0, 10)}${i}Qx7T`,
    tab: t.campaign === "SA Campaign Phase 2" ? "LI ads" : "All platforms",
    linkedBy: ["Alex Rivera", "Priya Shah", "Marcus Lee", "Dana Whitfield"][i % 4],
    syncedAt: `2026-10-${String(29 - i).padStart(2, "0")}`,
    rows,
  };
});

export const DECK_LIMITS = { platformHeadline: 70, intro: 150 } as const;
