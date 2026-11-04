import { describe, expect, it } from "vitest";
import { adName, parseAdName, parseFrameName, parseSlotName } from "./parse-frame-name";

describe("parseFrameName", () => {
  it("parses a valid frame", () => {
    expect(parseFrameName("AD | YourBrand | 1200x1200")).toEqual({ conceptKey: "YourBrand", width: 1200, height: 1200 });
  });
  it("rejects legacy and malformed names", () => {
    expect(parseFrameName("LI Marketing Consideration Ad #1_1200x1200")).toBeNull();
    expect(parseFrameName("AD | Your Brand | 1200x1200")).toBeNull();
  });
});

describe("parseSlotName", () => {
  it("parses slots with and without limits", () => {
    expect(parseSlotName("#headline[40]")).toEqual({ slot: "headline", maxChars: 40 });
    expect(parseSlotName("#hero")).toEqual({ slot: "hero", maxChars: undefined });
  });
  it("ignores locked layers", () => {
    expect(parseSlotName("Frame 2087325852")).toBeNull();
  });
});

describe("ad names", () => {
  it("round-trips", () => {
    const n = adName("YourBrand", { month: 7, year: 2025 }, 1200, 1200);
    expect(n).toBe("YourBrand072025_1200x1200");
    expect(parseAdName(n)).toEqual({ conceptKey: "YourBrand", month: 7, year: 2025, width: 1200, height: 1200 });
  });
  it("handles keys ending in digits poorly only by design: key must end in a letter", () => {
    expect(parseAdName("80Enterprise072025_720x900")?.conceptKey).toBe("80Enterprise");
  });
});
