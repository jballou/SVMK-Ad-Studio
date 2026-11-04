import { describe, expect, it } from "vitest";
import { autoMapColumns, parseAdBase, parseDeck, splitInAssetCopy } from "./parse";
import { LINKEDIN_LIMITS, validateRows } from "./validate";

// Mirrors the "LI ads" tab: repeated "Introductory Text" headers (count / text / limit).
const values = [
  ["R1 due", "Funnel", "Brief", "Ad Name", "In Asset Copy", "Platform", "Headline", "Character count", "Character limit", "Introductory Text (Body Copy)", "Introductory Text (Body Copy)", "Introductory Text (Body Copy)", "Landing Page"],
  ["6/27", "Consideration", "Phase 2", "YourBrand072025", "Your brand, your survey.", "LI Single Static ad", "Tailor every survey detail—from the first invite to the final question", "70", "70", "148", "Create surveys that feel like your brand.", "150", "/welcome/enterprise"],
  ["", "Intent", "Phase 2", "TakeBrand072025", "", "", "x".repeat(75), "", "", "145", "Every interaction is an opportunity.", "150", ""],
  ["", "", "", "", "stray note", "", "", "", "", "", "", "", ""],
];

describe("autoMapColumns", () => {
  it("picks the text column among duplicate headers", () => {
    const m = autoMapColumns(values);
    expect(m.intro).toBe(10);
    expect(m.headline).toBe(6);
    expect(m.adName).toBe(3);
  });
});

describe("parseDeck", () => {
  it("skips unnamed rows and keeps sheet row numbers", () => {
    const rows = parseDeck(values);
    expect(rows.map((r) => [r.adName, r.rowNumber])).toEqual([["YourBrand072025", 2], ["TakeBrand072025", 3]]);
    expect(rows[0].fields.intro).toBe("Create surveys that feel like your brand.");
    expect(rows[0].fields.funnel).toBe("Consideration");
  });
  it("throws without an Ad Name column", () => {
    expect(() => parseDeck([["Headline"], ["x"]])).toThrow(/Ad Name/);
  });
});

describe("validateRows", () => {
  it("flags over-limit copy", () => {
    const issues = validateRows(parseDeck(values), LINKEDIN_LIMITS);
    expect(issues).toContainEqual(expect.objectContaining({ adName: "TakeBrand072025", field: "headline", severity: "error", message: "75/70 characters" }));
    expect(issues.filter((i) => i.adName === "YourBrand072025" && i.severity === "error")).toHaveLength(0);
  });
});

describe("parseAdBase", () => {
  it("handles digit-leading keys and bad months", () => {
    expect(parseAdBase("80Enterprise072025")).toEqual({ conceptKey: "80Enterprise", month: 7, year: 2025 });
    expect(parseAdBase("Bad132025")).toBeNull();
  });
});

describe("splitInAssetCopy", () => {
  it("splits labeled variants", () => {
    const t = "LI Static Ad Copy:\nGet results fast.\n\nDisplay Ad Copy:\nReady to unlock more ROI?";
    expect(splitInAssetCopy(t)).toEqual({ "LI Static Ad Copy": "Get results fast.", "Display Ad Copy": "Ready to unlock more ROI?" });
    expect(splitInAssetCopy("Your brand, your survey.")).toEqual({ default: "Your brand, your survey." });
  });
});
