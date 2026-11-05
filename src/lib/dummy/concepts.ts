import type { AdArtSpec } from "@/lib/ads/types";
import { intentSlugFor } from "@/lib/templates/intents";
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
  /** Creative-intent template slug. When absent it is derived from the layout. */
  intent?: string;
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
  personas: string[], funnel: ConceptSeed["funnel"], offer: string, icp: string[], theme: number, layout: AdArtSpec["layout"], quality: number, draft = false, intent?: string,
): ConceptSeed => ({ key, campaign, headline, platformHeadline, intro, cta, landing, personas, funnel, offer, icp, theme, layout, quality, draft, intent });

const ENT = "/welcome/enterprise";
const SALES = "/welcome/contact-sales/";
const PH2 = "SA Campaign Phase 2";
// Copy for the "Consideration + Intent" concepts is taken from that page of the Today's SurveyMonkey Ads Figma file.
// Landing pages are still "TBD" in the designs; the customer quote is shown without the named individual.
const EVG = "Evergreen Awareness";
const INT = "Interest";
const CUST = "Customer Static Paid Social";
const MKI = "Marketing Interest";
const SCS = "SCS Consideration";
const MKC = "Marketing Consideration";
const CI = "Consideration + Intent";
const TBD = "/TBD";

export const CONCEPTS: ConceptSeed[] = [
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
  c("TrustAtScale", CI, "Industry-leading security. Proven results.", "Trust. At scale.", "From different industries. Different continents. Different challenges. Yet 260K+ organizations made the same choice—trusting SurveyMonkey.", "Learn more", TBD, ["IT", "Enterprise"], "Consideration", "Brand", ["Enterprise"], 7, "center", 1.1, false, "stat-proof-point"),
  c("TopFormsBuilder", CI, "The #1 online forms builder for businesses", "One platform. Every business size.", "G2 Leader for Enterprise, Mid-Market, and Small Business. SurveyMonkey works for teams at any stage. Start gathering insights that matter today.", "Learn more", TBD, ["Marketing"], "Intent", "Brand", ["Enterprise", "Mid-market", "SMB"], 2, "left", 1.05, false, "stat-proof-point"),
  c("MostPopularSurvey", CI, "The world's most popular survey platform", "14,500+ 5-star reviews on G2", "14,500+ teams rely on us for customer feedback, market research, and employee insights. Get the data you need to make confident decisions.", "Learn more", TBD, ["Marketing", "CX"], "Consideration", "Brand", ["Mid-market"], 0, "left", 1.15, false, "product-feature-spotlight"),
  c("EveryonesBFF", CI, "Everyone's BFF", "Wanna be friends?", "Real friends don't compromise on security or settle for mediocre results. We obsess over both. See why thousands of organizations made us their go-to.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Mid-market"], 3, "center", 0.9, false, "lifestyle-impact"),
  c("WinningStartsWithData", CI, "“SurveyMonkey allows us to ask what matters and find out what resonates within the marketplace.”", "Winning starts with data", "The Warriors use SurveyMonkey to understand their fans, creating diverse experiences, engaging social moments, and better-timed offerings. Discover how today.", "Learn more", TBD, ["Marketing", "CX"], "Consideration", "Brand", ["Enterprise"], 6, "bottom", 1.0, false, "customer-quote"),
  c("GuessingToKnowing", EVG, "Stop guessing. Start knowing.", "Gather continuous insight across your organization", "Understand your customers, employees, and market with real data in minutes.", "Learn more", TBD, ["Marketing"], "Awareness", "Brand", ["Mid-market"], 8, "center", 1.0, false, "lifestyle-impact"),
  c("NotJustSurveys", EVG, "Not. Just. Surveys.", "Market research, forms, audience panels, and more.", "Today's SurveyMonkey is more than surveys. See what else it can do for your team.", "Learn more", TBD, ["Marketing", "CX"], "Awareness", "Brand", ["Mid-market"], 0, "left", 1.1, false, "product-feature-spotlight"),
  c("SurveysJustBeginning", EVG, "Surveys are just the beginning", "Market research, forms, audience panels, and more.", "Go beyond surveys with market research, forms and audience panels in one platform.", "Learn more", TBD, ["Marketing"], "Awareness", "Brand", ["Mid-market"], 1, "left", 1.05, false, "product-feature-spotlight"),
  c("ImprovementThemes", INT, "Here are your top improvement themes", "Get charts, insights, and summaries in seconds", "Ask your feedback anything and get charts, insights and summaries in seconds.", "Learn more", TBD, ["CX"], "Consideration", "Brand", ["Mid-market"], 2, "bottom", 1.15, false, "product-in-use"),
  c("RicherDataSmarterEmails", INT, "Richer data. Smarter emails.", "Collect feedback right in the email", "Put the first survey question in your email and get richer data from every send.", "Learn more", TBD, ["Marketing", "CX"], "Consideration", "Brand", ["Mid-market"], 3, "left", 1.0, false, "product-feature-spotlight"),
  c("SurveyGlowUp", INT, "Your survey's glow up routine", "Catch bias. Clock bad questions. Up response rates.", "Get your survey ready to send: catch bias, flag bad questions and lift response rates.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["SMB"], 4, "left", 0.95, false, "product-feature-spotlight"),
  c("DodgeballFeedback", CUST, "“Being able to build continuous feedback into the way we operate has been transformational.”", "How Dodgeball Canada listens", "See how Dodgeball Canada turned continuous feedback into a way of operating.", "Learn more", TBD, ["CX"], "Consideration", "Brand", ["SMB"], 5, "bottom", 1.0, false, "customer-quote"),
  c("NoomRetention", CUST, "How Noom listened to 30K people to build a high-retention product", "Engagement and retention, measured", "Learn how Noom listened to 30K people to build a high-retention product.", "Learn more", TBD, ["CX", "Marketing"], "Consideration", "Brand", ["Enterprise"], 6, "bottom", 1.1, false, "customer-quote"),
  c("EventFeedbackOnTheSpot", MKI, "This year's event had higher speaker ratings than last year", "Feedback on the spot", "Capture event feedback on the spot and compare speaker ratings year over year.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Mid-market"], 7, "bottom", 0.95, false, "product-in-use"),
  c("PrecisionTargeting", MKI, "Precision targeting. At scale.", "Reach the audience you need", "Target by country, gender, income and age to reach the audience you need, at scale.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Mid-market"], 9, "left", 1.05, false, "product-feature-spotlight"),
  c("KnowYourAudience", MKI, "How well do you know your target audience?", "Connect to 200+ apps", "Put your audience research to work with 200+ app integrations.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["SMB"], 3, "center", 0.9, true, "lifestyle-impact"),
  c("NoSilos", SCS, "Don't build surveys in silos", "Connect to 200+ apps", "Connect SurveyMonkey to 200+ apps so feedback reaches every team.", "Learn more", TBD, ["IT"], "Consideration", "Brand", ["Enterprise"], 0, "left", 1.0, false, "product-feature-spotlight"),
  c("OneSourceOfTruth", SCS, "One platform. One source of truth. Across every team.", "Workgroups for every team", "Bring every team onto one platform with shared workgroups and one source of truth.", "Learn more", TBD, ["IT", "Enterprise"], "Consideration", "Brand", ["Enterprise"], 6, "left", 1.1, false, "product-feature-spotlight"),
  c("FeedbackLoops", SCS, "Feedback loops that actually loop", "Connect to 200+ apps", "Close the loop by connecting feedback to the 200+ apps your teams already use.", "Learn more", TBD, ["IT"], "Consideration", "Brand", ["Enterprise"], 1, "center", 1.0, false, "product-feature-spotlight"),
  c("TeamsTogether", SCS, "Your teams were made to work together.", "Collaborate on surveys in real time", "Comment, edit logic and build surveys together with your team.", "Learn more", TBD, ["IT", "Enterprise"], "Consideration", "Brand", ["Enterprise"], 2, "bottom", 1.05, false, "product-in-use"),
  c("TrustTheData", MKC, "When multi millions are on the line, trust the data.", "How ClickUp went from ad testing to 113 million views", "Discover how ClickUp went from ad testing to 113 million views.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Enterprise"], 8, "bottom", 1.15, false, "customer-quote"),
  c("DataBackedPersonas", MKC, "Data-backed personas drive better marketing", "How Kajabi improved its marketing strategy", "Discover how Kajabi used our market research tools to improve their marketing strategy.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Mid-market"], 4, "left", 1.0, false, "customer-quote"),
  c("GoodCompany", MKC, "You're in good company", "260K+ of them", "260K+ organizations trust SurveyMonkey. See who's already on board.", "Learn more", TBD, ["Marketing"], "Consideration", "Brand", ["Enterprise"], 5, "center", 1.0, false, "stat-proof-point"),
];

export const CONCEPT_PLATFORMS: PlatformKey[][] = [
  ["linkedin", "meta"], ["linkedin", "display"], ["meta", "display"], ["linkedin", "newsletter"],
  ["meta", "newsletter"], ["linkedin", "meta"], ["display", "newsletter"], ["linkedin", "display"],
];

/** The creative-intent template slug for a concept (same mapping the seeded ads use). */
export function conceptIntent(key: string): string | undefined {
  const i = CONCEPTS.findIndex((c) => c.key === key);
  return i < 0 ? undefined : CONCEPTS[i].intent ?? intentSlugFor(CONCEPTS[i].layout, i);
}

/** Real ad exports from the Figma "Consideration + Intent" page, kept in public/examples. Concepts without one use generated art. */
const EXAMPLE_IMAGES: Record<string, string> = {
  TrustAtScale: "/examples/trust-at-scale.png",
  TopFormsBuilder: "/examples/top-forms-builder.png",
  MostPopularSurvey: "/examples/most-popular-survey.png",
  EveryonesBFF: "/examples/everyones-bff.png",
  WinningStartsWithData: "/examples/winning-starts-with-data.png",
  GuessingToKnowing: "/examples/guessing-to-knowing.png",
  NotJustSurveys: "/examples/not-just-surveys.png",
  SurveysJustBeginning: "/examples/surveys-just-beginning.png",
  ImprovementThemes: "/examples/improvement-themes.png",
  RicherDataSmarterEmails: "/examples/richer-data-smarter-emails.png",
  SurveyGlowUp: "/examples/survey-glow-up.png",
  DodgeballFeedback: "/examples/dodgeball-feedback.png",
  NoomRetention: "/examples/noom-retention.png",
  EventFeedbackOnTheSpot: "/examples/event-feedback-on-the-spot.png",
  PrecisionTargeting: "/examples/precision-targeting.png",
  KnowYourAudience: "/examples/know-your-audience.png",
  NoSilos: "/examples/no-silos.png",
  OneSourceOfTruth: "/examples/one-source-of-truth.png",
  FeedbackLoops: "/examples/feedback-loops.png",
  TeamsTogether: "/examples/teams-together.png",
  TrustTheData: "/examples/trust-the-data.png",
  DataBackedPersonas: "/examples/data-backed-personas.png",
  GoodCompany: "/examples/good-company.png",
};
export const conceptImage = (key: string): string | undefined => EXAMPLE_IMAGES[key];
