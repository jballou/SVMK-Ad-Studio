import { CONCEPTS, CONCEPT_PLATFORMS, type ConceptSeed } from "./concepts";
import { addDays, daysBetween, mulberry32, normal, weekday, type Rng } from "./rng";
import type { AdStatus } from "@/lib/ads/types";
import type { PlatformKey } from "@/lib/specs/platforms";

export const DUMMY_TODAY = "2026-11-03";
const FIRST_LAUNCH = "2026-05-04";

export interface DummyAd {
  name: string;
  conceptKey: string;
  platform: PlatformKey;
  placement: string;
  width: number;
  height: number;
  status: AdStatus;
  launchedAt?: string;
  pausedAt?: string;
  geo: string[];
  /** Per-ad performance multiplier (hidden from the UI; drives the metric model). */
  quality: number;
  /** Manual scorecard checks for the current quarter (launched ads only). */
  checks?: { campaignActive: boolean; landingPageClear: boolean; ctaMatch: boolean; icpMatch: boolean };
}

export interface DummyDay {
  adName: string;
  day: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface DummyExperiment {
  name: string;
  variable: string;
  hypothesis: string;
  adA: string;
  adB: string;
  status: "running" | "concluded";
  startedAt: string;
}

export interface DummyBatch {
  name: string;
  status: "generated" | "exported";
  createdBy: string;
  createdAt: string;
  concepts: string[];
  placements: string[];
  adCount: number;
}

export interface DummyBenchmark {
  platform: string;
  funnel: string;
  metric: "ctr" | "cpc" | "cvr";
  value: number;
  direction: "higher" | "lower";
  tier: "primary" | "secondary";
  source: string;
}

export interface DummyData {
  today: string;
  concepts: ConceptSeed[];
  ads: DummyAd[];
  daily: DummyDay[];
  experiments: DummyExperiment[];
  batches: DummyBatch[];
  benchmarks: DummyBenchmark[];
}

const SLOTS: Record<PlatformKey, { placement: string; sizes: [number, number][] }[]> = {
  linkedin: [{ placement: "linkedin-single-image", sizes: [[1200, 1200], [1200, 628], [720, 900]] }],
  meta: [
    { placement: "instagram-feed", sizes: [[1080, 1350]] },
    { placement: "facebook-feed", sizes: [[1080, 1080]] },
    { placement: "meta-stories-reels", sizes: [[1080, 1920]] },
  ],
  display: [{ placement: "display-standard", sizes: [[300, 250], [728, 90], [300, 600]] }],
  newsletter: [{ placement: "newsletter", sizes: [[600, 200], [600, 300]] }],
};

const MODEL: Record<PlatformKey, { cpm: number; ctr: number; cvr: number; daily: number }> = {
  linkedin: { cpm: 42, ctr: 0.0055, cvr: 0.03, daily: 16_000 },
  meta: { cpm: 12, ctr: 0.0095, cvr: 0.022, daily: 42_000 },
  display: { cpm: 4.5, ctr: 0.0014, cvr: 0.012, daily: 85_000 },
  newsletter: { cpm: 28, ctr: 0.009, cvr: 0.04, daily: 11_000 },
};
const FUNNEL_CVR = { Awareness: 0.6, Consideration: 1, Intent: 1.5 } as const;

function pickStatus(r: Rng, age: number, quality: number): AdStatus {
  const x = r();
  if (age >= 90) {
    if (quality >= 1.15) return x < 0.7 ? "live" : "paused";
    if (quality < 0.95) return x < 0.75 ? "retired" : "paused";
    return x < 0.25 ? "live" : x < 0.6 ? "paused" : "retired";
  }
  if (age >= 60) return x < (quality < 0.9 ? 0.4 : 0.6) ? "live" : x < 0.8 ? "paused" : "retired";
  return x < 0.88 ? "live" : "paused";
}

function dailyFor(r: Rng, ad: DummyAd, funnel: ConceptSeed["funnel"], today: string): DummyDay[] {
  if (!ad.launchedAt) return [];
  const m = MODEL[ad.platform];
  const end = ad.pausedAt ?? today;
  const scale = 0.45 + r() * 1.1;
  const fatigue = r() < 0.18 ? 0.5 + r() * 0.15 : 0.1 + r() * 0.25;
  const out: DummyDay[] = [];
  for (let t = 0, d = ad.launchedAt; d <= end; t++, d = addDays(ad.launchedAt, t)) {
    const wd = weekday(d);
    const ramp = t < 5 ? 0.4 + t * 0.12 : 1;
    const dow = wd === 0 || wd === 6 ? 0.62 : 1;
    const impressions = Math.max(50, Math.round(m.daily * scale * ramp * dow * (1 + 0.12 * normal(r))));
    const ctr = Math.max(0.0002, m.ctr * ad.quality * (1 - fatigue * Math.min(1, t / 50)) * (1 + 0.07 * normal(r)));
    const clicks = Math.max(0, Math.round(impressions * ctr));
    const cvr = m.cvr * FUNNEL_CVR[funnel] * Math.sqrt(ad.quality) * (1 + 0.1 * normal(r));
    const conversions = Math.max(0, Math.round(clicks * cvr));
    const spend = Math.round(((impressions * m.cpm) / 1000) * (1 + 0.05 * normal(r)) * 100) / 100;
    out.push({ adName: ad.name, day: d, spend, impressions, clicks, conversions });
  }
  return out;
}

export function generateDummyData(seed = 20261103): DummyData {
  const r = mulberry32(seed);
  const today = DUMMY_TODAY;
  const active = CONCEPTS.filter((c) => !c.draft);
  const ads: DummyAd[] = [];
  const daily: DummyDay[] = [];

  CONCEPTS.forEach((concept, ci) => {
    const idx = concept.draft ? 0 : ci;
    const conceptLaunch = addDays(FIRST_LAUNCH, Math.round((idx * 172) / Math.max(1, active.length - 1)));
    const platforms = CONCEPT_PLATFORMS[ci % CONCEPT_PLATFORMS.length];
    for (const platform of platforms) {
      const offset = Math.floor(r() * 4);
      const launch = concept.draft ? undefined : addDays(conceptLaunch, offset);
      const geo = r() < 0.7 ? ["US"] : ["US", "UK"];
      for (const slot of SLOTS[platform]) {
        for (const [w, h] of slot.sizes) {
          const quality = concept.quality * Math.exp(0.18 * normal(r));
          let status: AdStatus = "draft";
          let pausedAt: string | undefined;
          if (launch) {
            const age = daysBetween(launch, today);
            status = pickStatus(r, age, quality);
            if (status !== "live") pausedAt = addDays(launch, Math.min(age - 1, 21 + Math.floor(r() * 55)));
          }
          const mm = launch ? launch.slice(5, 7) : "11";
          const yyyy = launch ? launch.slice(0, 4) : "2026";
          const name = `${concept.key}${mm}${yyyy}_${w}x${h}`;
          const checks = launch
            ? { campaignActive: status === "live" || r() < 0.2, landingPageClear: r() < 0.85, ctaMatch: r() < 0.9, icpMatch: r() < 0.8 }
            : undefined;
          const ad: DummyAd = { name, conceptKey: concept.key, platform, placement: slot.placement, width: w, height: h, status, launchedAt: launch, pausedAt, geo, quality, checks };
          ads.push(ad);
          daily.push(...dailyFor(r, ad, concept.funnel, today));
        }
      }
    }
  });

  return { today, concepts: CONCEPTS, ads, daily, experiments: makeExperiments(r, ads), batches: makeBatches(ads), benchmarks: makeBenchmarks() };
}

const VARIABLES = [
  ["headline", "A question headline will out-click a statement"],
  ["imagery", "Illustrated creative beats a typographic layout"],
  ["layout", "Centered type holds attention longer than left-aligned"],
  ["offer", "A report offer drives more clicks than a brand message"],
  ["cta", "'Book a demo' converts better than 'Learn more'"],
] as const;

function makeExperiments(r: Rng, ads: DummyAd[]): DummyExperiment[] {
  const conceptOf = new Map(CONCEPTS.map((c) => [c.key, c]));
  // Live ads first so some tests are still running; deterministic shuffle within each group.
  const launched = ads.filter((a) => a.launchedAt).map((a) => ({ a, k: (a.status === "live" ? 0 : 1) + r() * 0.99 })).sort((x, y) => x.k - y.k).map((x) => x.a);
  const used = new Set<string>();
  const out: DummyExperiment[] = [];
  for (const a of launched) {
    if (out.length >= 12) break;
    if (used.has(a.name)) continue;
    const ca = conceptOf.get(a.conceptKey)!;
    const b = launched.find(
      (x) => !used.has(x.name) && x.conceptKey !== a.conceptKey && x.platform === a.platform && x.width === a.width && x.height === a.height &&
        conceptOf.get(x.conceptKey)!.funnel === ca.funnel && Math.abs(daysBetween(a.launchedAt!, x.launchedAt!)) <= 14 &&
        // Similar underlying quality, so results are a mix of clear winners and ties.
        Math.abs(Math.log(x.quality / a.quality)) < 0.22,
    );
    if (!b) continue;
    used.add(a.name); used.add(b.name);
    const [first, second] = r() < 0.5 ? [a, b] : [b, a];
    const [variable, hypothesis] = VARIABLES[out.length % VARIABLES.length];
    out.push({
      name: `${first.conceptKey} vs ${second.conceptKey} (${a.width}×${a.height})`,
      variable, hypothesis, adA: first.name, adB: second.name,
      status: a.status === "live" && b.status === "live" ? "running" : "concluded",
      startedAt: a.launchedAt! > b.launchedAt! ? a.launchedAt! : b.launchedAt!,
    });
  }
  return out;
}

const PEOPLE = ["Alex Rivera", "Priya Shah", "Marcus Lee", "Dana Whitfield"];

function makeBatches(ads: DummyAd[]): DummyBatch[] {
  const groups: [string, string[]][] = [
    ["Today's SurveyMonkey: Awareness wave 1", ["HumansMatter", "JustBeginning", "GuessingKnowing"]],
    ["Phase 2: LinkedIn Consideration", ["YourBrand", "CaptureFeedback", "FasterInsights"]],
    ["Phase 2: Intent and demo requests", ["GetInsights", "EasySet", "80Enterprise", "TakeBrand"]],
    ["CX Gap report promotion", ["CXGap", "RenewalMoment"]],
    ["Integrations: Tableau and Power BI", ["TableauBridge", "DataDetective", "IntegrateAll"]],
    ["EX Awareness: people-first", ["PeopleFirst", "PulseCheck", "ManagerReady"]],
    ["Market Research refresh", ["ResearchFaster", "AudienceInsight"]],
  ];
  const first = new Map<string, string>();
  for (const a of ads) if (a.launchedAt && (!first.has(a.conceptKey) || a.launchedAt < first.get(a.conceptKey)!)) first.set(a.conceptKey, a.launchedAt);
  return groups.map(([name, keys], i) => {
    const mine = ads.filter((a) => keys.includes(a.conceptKey));
    const launch = keys.map((k) => first.get(k)).filter(Boolean).sort()[0] ?? "2026-05-04";
    return {
      name, concepts: keys, adCount: mine.length,
      placements: [...new Set(mine.map((a) => a.placement))],
      status: i % 3 === 0 ? "exported" : "generated",
      createdBy: PEOPLE[i % PEOPLE.length],
      createdAt: `${addDays(launch, -6)}T16:20:00Z`,
    };
  });
}

function makeBenchmarks(): DummyBenchmark[] {
  const CTR: Record<string, [number, number, number]> = {
    linkedin: [0.5, 0.55, 0.6], meta: [0.85, 0.95, 1.0], display: [0.12, 0.14, 0.15], newsletter: [0.8, 0.9, 1.0],
  };
  const CPC: Record<string, [number, number, number]> = {
    linkedin: [9, 8, 8], meta: [1.4, 1.3, 1.3], display: [3.4, 3.2, 3.0], newsletter: [3.2, 3.0, 3.0],
  };
  const funnels = ["Awareness", "Consideration", "Intent"] as const;
  const out: DummyBenchmark[] = [];
  for (const p of Object.keys(CTR)) {
    funnels.forEach((f, i) => {
      out.push({ platform: p, funnel: f, metric: "ctr", value: CTR[p][i], direction: "higher", tier: "primary", source: "Abacus (sample)" });
      out.push({ platform: p, funnel: f, metric: "cpc", value: CPC[p][i], direction: "lower", tier: "secondary", source: "Abacus (sample)" });
      if (i > 0) out.push({ platform: p, funnel: f, metric: "cvr", value: 2.5 * i, direction: "higher", tier: "secondary", source: "Abacus (sample)" });
    });
  }
  return out;
}
