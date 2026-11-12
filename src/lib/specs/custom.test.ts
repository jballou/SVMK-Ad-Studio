import { afterEach, describe, expect, it } from "vitest";
import { buildPlatform, cleanStored, parseSizes, slugify } from "./custom";
import { allPlacements, platformColor, platformKeys, platformLabel, placementsFor, setCustomPlatforms } from "./platforms";
import { placementRule } from "@/lib/composition/rules";

const draft = { label: "Spotify", color: "#08794A", ctaRequired: true, placements: "Feed: 640x640, 1200x628\nStory: 1080x1920" };

afterEach(() => setCustomPlatforms([]));

describe("parseSizes", () => {
  it("reads sizes in common spellings", () => {
    expect(parseSizes("1200x628, 600 × 500; 300X250")).toEqual([{ w: 1200, h: 628 }, { w: 600, h: 500 }, { w: 300, h: 250 }]);
  });
  it("rejects bad input with a readable message", () => {
    expect(() => parseSizes("")).toThrow(/at least one/);
    expect(() => parseSizes("big")).toThrow(/isn't a size/);
    expect(() => parseSizes("10x10")).toThrow(/outside/);
    expect(() => parseSizes("300x250, 300x250")).toThrow(/twice/);
  });
});

describe("buildPlatform", () => {
  it("builds a platform with placement keys scoped to it", () => {
    const r = buildPlatform(draft, ["meta"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.platform.key).toBe("spotify");
    expect(r.platform.placements.map((p) => p.key)).toEqual(["spotify-feed", "spotify-story"]);
  });
  it("refuses duplicate names, bad colors and empty placements", () => {
    expect(buildPlatform({ ...draft, label: "Meta" }, ["meta"])).toMatchObject({ ok: false });
    expect(buildPlatform({ ...draft, color: "red" }, [])).toMatchObject({ ok: false });
    expect(buildPlatform({ ...draft, placements: "  " }, [])).toMatchObject({ ok: false });
  });
  it("warns when a size is already used by another placement", () => {
    const r = buildPlatform({ ...draft, placements: "1200x628" }, [], new Map([["1200x628", "LinkedIn single image"]]));
    expect(r.ok && r.warnings[0]).toMatch(/LinkedIn single image/);
  });
  it("uses the platform name when a line has no label", () => {
    const r = buildPlatform({ ...draft, placements: "300x250" }, []);
    expect(r.ok && r.platform.placements[0].label).toBe("Spotify");
  });
});

describe("registry", () => {
  it("makes an added platform visible everywhere the built-ins are", () => {
    const r = buildPlatform(draft, platformKeys());
    if (!r.ok) throw new Error(r.error);
    setCustomPlatforms([r.platform]);
    expect(platformKeys()).toContain("spotify");
    expect(platformLabel("spotify")).toBe("Spotify");
    expect(platformColor("spotify")).toBe("#08794A");
    expect(placementsFor("spotify")).toHaveLength(2);
    expect(allPlacements().some((p) => p.key === "spotify-feed")).toBe(true);
  });
  it("applies the CTA setting to the placement rule", () => {
    const r = buildPlatform({ ...draft, ctaRequired: false }, []);
    if (!r.ok) throw new Error(r.error);
    setCustomPlatforms([r.platform]);
    expect(placementRule("spotify-feed")).toMatchObject({ uiAddsCta: true, ctaRequired: false });
  });
  it("falls back to the key for an unknown platform", () => {
    expect(platformLabel("nope")).toBe("nope");
  });
});

describe("cleanStored", () => {
  it("drops malformed entries instead of crashing", () => {
    expect(cleanStored("x")).toEqual([]);
    expect(cleanStored([{ key: 1 }, null, { key: "a", label: "A", color: "#000", placements: [{ key: "a-1", label: "x", sizes: [{ w: 1, h: 2 }] }] }])).toHaveLength(1);
  });
  it("slugifies", () => expect(slugify("Reddit Ads!")).toBe("reddit-ads"));
});
