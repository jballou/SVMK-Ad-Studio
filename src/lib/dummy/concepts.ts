import type { AdArtSpec } from "@/lib/ads/types";
import type { PlatformKey } from "@/lib/specs/platforms";

export interface ConceptSeed {
  key: string;
  campaign: string;
  headline: string;
  platformHeadline: string;
  intro: string;
  cta: string;
  landing: string;
  personas: string[];
  funnel: "Awareness" | "Consideration" | "Intent";
  offer: string;
  icp: string[];
  theme: number;
  layout: AdArtSpec["layout"];
  /** Relative creative quality (1 = average). Drives the performance model. */
  quality: number;
  draft?: boolean;
}

export const THEMES: Omit<AdArtSpec, "layout">[] = [
  { bg: "#EDEDFD", fg: "#25244D", accent: "#7068EB" }, // periwinkle
  { bg: "#D9F0F2", fg: "#104848", accent: "#348289" }, // teal
  { bg: "#D6F5DE", fg: "#10412C", accent: "#08794A" }, // green
  { bg: "#F9F2D2", fg: "#463802", accent: "#A18102" }, // yellow
  { bg: "#F9E8D2", fg: "#4C290B", accent: "#A95C18" }, // orange
  { bg: "#EEEFD5", fg: "#393F12", accent: "#728125" }, // lime
  { bg: "#2C3666", fg: "#EDEDFD", accent: "#ABBBF6" }, // deep periwinkle
  { bg: "#105638", fg: "#D6F5DE", accent: "#7DD9A3" }, // deep green
  { bg: "#242423", fg: "#F2E2A6", accent: "#EBD370" }, // ink
  { bg: "#F7DBD4", fg: "#3C1D1D", accent: "#AE453F" }, // red
];

const c = (
  key: string, campaign: string, headline: string, platformHeadline: string, intro: string, cta: string, landing: string,
  personas: string[], funnel: ConceptSeed["funnel"], offer: string, icp: string[], theme: number, layout: AdArtSpec["layout"], quality: number, draft = false,
): ConceptSeed => ({ key, campaign, headline, platformHeadline, intro, cta, landing, personas, funnel, offer, icp, theme, layout, quality, draft });

const ENT = "/welcome/enterprise";
const SALES = "/welcome/contact-sales/";
const AWARE = "Today's SurveyMonkey";
const PH2 = "SA Campaign Phase 2";

export const CONCEPTS: ConceptSeed[] = [
  c("HumansMatter", AWARE, "Behind every response is a human.", "Listen to the people behind the data", "Great feedback starts with listening. See how SurveyMonkey helps you hear every voice.", "Learn more", "/welcome/humans", ["CX"], "Awareness", "Brand", ["Enterprise"], 0, "left", 1.25),
  c("JustBeginning", AWARE, "You've only just begun to listen.", "There's more to hear. Start with SurveyMonkey", "Every answer opens a new question. Start hearing what your customers really mean.", "Learn more", "/welcome/begin", ["Marketing"], "Awareness", "Brand", ["Mid-market"], 8, "center", 1.4),
  c("GuessingKnowing", AWARE, "Stop guessing. Start knowing.", "Replace assumptions with answers", "Guesswork is expensive. Get the answers that move your business forward.", "Learn more", "/welcome/know", ["Marketing", "CX"], "Awareness", "Brand", ["Mid-market"], 3, "left", 0.85),
  c("NotSurveys", AWARE, "It's not just surveys.", "A feedback platform, not just forms", "Surveys are the start. Turn feedback into decisions with one connected platform.", "Learn more", "/welcome/platform", ["IT"], "Awareness", "Brand", ["Enterprise"], 6, "bottom", 1.1),
  c("DataDecisions", AWARE, "Turn data into decisions.", "From feedback data to confident decisions", "Connect survey results to the tools your team already uses.", "Learn more", "/welcome/data", ["IT", "Marketing"], "Awareness", "Brand", ["Enterprise"], 1, "left", 0.9),
  c("StillListen", AWARE, "Still listening? Start hearing.", "Hear what your customers actually mean", "Hearing is more than collecting. Get the insight behind every answer.", "Learn more", "/welcome/hear", ["CX"], "Awareness", "Brand", ["Mid-market"], 4, "center", 0.75),
  c("FeedbackOrg", AWARE, "Feedback your whole org can use.", "One feedback program for every team", "Share insights across teams so everyone acts on the same source of truth.", "Learn more", "/welcome/org", ["EX", "IT"], "Awareness", "Brand", ["Enterprise"], 7, "bottom", 0.7),
  c("WhereWork", AWARE, "Where work gets better.", "Make every workplace better, faster", "Listen to your people and turn their feedback into a better place to work.", "Learn more", "/welcome/work", ["EX"], "Awareness", "Brand", ["Enterprise"], 2, "left", 1.05),
  c("LeadReal", AWARE, "Lead with real insight.", "Lead with what customers really say", "Real answers beat gut feel. Make the next call with confidence.", "Learn more", "/welcome/lead", ["Marketing"], "Awareness", "Brand", ["SMB"], 9, "center", 0.8),
  c("SmartListen", AWARE, "Listen smarter with AI.", "AI-powered analysis in seconds", "Let AI surface the themes in your feedback so you can act faster.", "Try it free", "/welcome/ai", ["Marketing", "CX"], "Awareness", "Free trial", ["Mid-market"], 0, "bottom", 1.2),
  c("YourBrand", PH2, "Your brand, your survey.", "Tailor every survey detail, from invite to final question", "Create surveys that feel like your brand. Customize every detail to build trust and boost responses.", "Learn more", ENT, ["Marketing"], "Consideration", "Brand", ["Enterprise"], 5, "left", 1.0),
  c("CaptureFeedback", PH2, "Capture feedback anytime, anywhere.", "Collect real-time feedback wherever customers are", "Meet customers on the channels they prefer: SMS, WhatsApp, QR codes and more.", "Learn more", ENT, ["CX"], "Consideration", "Brand", ["Enterprise"], 1, "center", 1.15),
  c("FasterInsights", PH2, "Faster insights, smarter moves.", "Speed up feedback to action", "Connect SurveyMonkey to 200+ tools and turn feedback into faster decisions.", "Learn more", ENT, ["IT"], "Consideration", "Brand", ["Enterprise"], 6, "left", 0.95),
  c("GetInsights", PH2, "Ready to unlock more ROI?", "Get the insights you need to maximize ROI", "Get real-time, meaningful insights with our AI-powered, secure platform.", "Book a demo", SALES, ["Enterprise"] as string[], "Intent", "Demo", ["Enterprise"], 7, "bottom", 1.3),
  c("EasySet", PH2, "Easy to set up. Powerful features.", "Perfect for every team, no complexity", "Our flexible platform has all the features you need and none of the complexity.", "Book a call", SALES, ["Marketing"], "Intent", "Demo", ["Mid-market"], 3, "center", 0.85),
  c("80Enterprise", PH2, "80% of Enterprise customers see ROI in 12 months.", "See the impact for yourself", "Trusted by 95% of the Fortune 500. See SurveyMonkey Enterprise in action.", "Book a demo", SALES, ["Enterprise"], "Intent", "Demo", ["Enterprise"], 8, "left", 1.45),
  c("TakeBrand", PH2, "Take your brand from ordinary to unforgettable.", "Create better experiences with SurveyMonkey AI", "Every interaction is an opportunity. Discover what resonates with your audience.", "Book a demo", SALES, ["Marketing"], "Intent", "Demo", ["Enterprise"], 9, "bottom", 0.8),
  c("CXGap", PH2, "Bridge the CX gap.", "Uncover what customers truly want and expect", "76% of consumers say they are underwhelmed by brand interactions. Get the report.", "Download", "/resources/cx-gap", ["CX"], "Consideration", "Report", ["Enterprise"], 0, "left", 1.2),
  c("RenewalMoment", PH2, "Win the moment that matters: the renewal.", "Personalize your renewal experience", "Don't lose customers at renewal. Find out how to close the experience gap.", "Download", "/resources/cx-gap", ["CX"], "Consideration", "Report", ["Mid-market"], 4, "center", 0.9),
  c("TableauBridge", PH2, "From data chaos to data clarity.", "Smart integrations for Tableau and Power BI", "Stop patching dashboards. One source of truth, not scattered reports.", "Download", "/resources/integrations", ["IT"], "Consideration", "Guide", ["Enterprise"], 1, "bottom", 1.05),
  c("DataDetective", PH2, "Still playing data detective?", "Connect survey and business data fast", "Surface insights without detective work. See how integrations unlock insight.", "Download", "/resources/integrations", ["IT", "Marketing"], "Consideration", "Guide", ["Mid-market"], 5, "left", 0.7),
  c("PeopleFirst", "EX Awareness", "People first. Always listening.", "Put your people first", "Employee feedback that leads to action, from onboarding to exit.", "Learn more", "/welcome/employee", ["EX"], "Awareness", "Brand", ["Enterprise"], 2, "center", 1.0),
  c("PulseCheck", "EX Awareness", "Take the pulse of your team.", "Quick pulse surveys for any team", "Know how your team is really doing, with templates that take minutes to launch.", "Try it free", "/welcome/pulse", ["EX"], "Consideration", "Free trial", ["Mid-market"], 7, "left", 1.1),
  c("ManagerReady", "EX Awareness", "Managers deserve better feedback.", "Feedback that helps managers grow", "Give every people manager the insight they need to lead well.", "Learn more", "/welcome/managers", ["EX"], "Consideration", "Webinar", ["Enterprise"], 6, "bottom", 0.85),
  c("ResearchFaster", "Market Research", "Market research in days, not weeks.", "Get audience answers fast", "Reach your target audience and get statistically sound answers quickly.", "Get started", "/market-research", ["Marketing"], "Consideration", "Free trial", ["Mid-market"], 3, "center", 1.25),
  c("AudienceInsight", "Market Research", "Know your audience before you launch.", "Test ideas with real people first", "Validate concepts, messaging and pricing before you spend on launch.", "Book a demo", SALES, ["Marketing"], "Intent", "Demo", ["Mid-market"], 0, "left", 1.0),
  c("SecureAtScale", AWARE, "Enterprise-grade security, built in.", "Security and compliance you can trust", "SSO, audit logs and data residency for every team in your organization.", "Book a demo", SALES, ["IT"], "Intent", "Demo", ["Enterprise"], 8, "left", 0.95),
  c("IntegrateAll", AWARE, "200+ integrations. One source of truth.", "Connect feedback to every tool you use", "Pipe survey responses into the systems your teams already live in.", "Learn more", "/integrations", ["IT"], "Consideration", "Guide", ["Enterprise"], 1, "bottom", 1.0),
  c("AIInsights", "Q1 Preview", "Ask your feedback anything.", "Chat with your survey data", "Ask questions in plain language and get answers from your responses.", "Try it free", "/welcome/ai-chat", ["Marketing", "CX"], "Awareness", "Free trial", ["Mid-market"], 0, "center", 1.0, true),
  c("NPSNow", "Q1 Preview", "Know your NPS in an afternoon.", "Launch NPS in minutes", "Prebuilt NPS programs with benchmarks built in.", "Get started", "/welcome/nps", ["CX"], "Consideration", "Free trial", ["SMB"], 2, "left", 1.0, true),
  c("BenchmarkYou", "Q1 Preview", "How do you compare?", "See how you stack up", "Industry benchmarks for every metric you measure.", "Learn more", "/welcome/benchmarks", ["Marketing"], "Awareness", "Report", ["Enterprise"], 4, "bottom", 1.0, true),
];

export const CONCEPT_PLATFORMS: PlatformKey[][] = [
  ["linkedin", "meta"], ["linkedin", "display"], ["meta", "display"], ["linkedin", "newsletter"],
  ["meta", "newsletter"], ["linkedin", "meta"], ["display", "newsletter"], ["linkedin", "display"],
];
