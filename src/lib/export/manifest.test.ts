import { describe, expect, it } from "vitest";
import type { AdRecord } from "@/lib/ads/types";
import { csvCell, estimateBytes, exportPath, manifestRows, MANIFEST_HEADER, toCsv } from "./manifest";

const ad: AdRecord = { id: "A_1x1", name: "A112026_1200x628", conceptKey: "A", platform: "linkedin", placement: "linkedin-single-image", width: 1200, height: 628, status: "live", launchedAt: "2026-11-01", tags: { persona: ["CX", "IT"], funnel: "Intent" }, copy: { headline: 'Say "hi", now', intro: "Line one\nline two", platformHeadline: "H", cta: "Go", landing: "/x" } };

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(0)).toBe("0");
  });
  it("builds a manifest with a column per header", () => {
    const rows = manifestRows([ad], "platform", "png");
    expect(rows[0]).toHaveLength(MANIFEST_HEADER.length);
    const csv = toCsv(MANIFEST_HEADER, rows);
    expect(csv.split("\r\n")[0]).toBe(MANIFEST_HEADER.join(","));
    expect(csv).toContain("linkedin/1200x628/A112026_1200x628.png");
    expect(csv).toContain('"Say ""hi"", now"');
  });
});

describe("paths and estimates", () => {
  it("lays files out per structure", () => {
    expect(exportPath(ad, "platform", "jpg")).toBe("linkedin/1200x628/A112026_1200x628.jpg");
    expect(exportPath(ad, "concept", "png")).toBe("A/A112026_1200x628.png");
    expect(exportPath(ad, "flat", "png")).toBe("A112026_1200x628.png");
  });
  it("scales the estimate with area and resolution", () => {
    const one = estimateBytes([ad], "png", 1);
    expect(estimateBytes([ad], "png", 2)).toBeCloseTo(one * 4);
    expect(estimateBytes([ad], "jpg", 1)).toBeLessThan(one);
  });
});
