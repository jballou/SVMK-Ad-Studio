import { describe, expect, it } from "vitest";
import { checkFit, placementsFitting } from "./fit";
import { PLACEMENTS } from "./platforms";

const get = (k: string) => PLACEMENTS.find((p) => p.key === k)!;

describe("checkFit", () => {
  it("accepts 1:1 and 4:5 in feeds", () => {
    expect(checkFit(1080, 1080, get("instagram-feed")).status).toBe("ok");
    expect(checkFit(720, 900, get("instagram-feed")).status).toBe("ok");
  });
  it("crops 9:16 on Threads to 4:5", () => {
    expect(checkFit(1080, 1920, get("threads-feed"))).toMatchObject({ status: "cropped", to: 0.8 });
  });
  it("rejects 1:1 in Stories", () => {
    expect(checkFit(1080, 1080, get("meta-stories-reels")).status).toBe("unsupported");
  });
});

describe("placementsFitting", () => {
  it("lists runnable Meta placements for 1200x628", () => {
    const keys = placementsFitting(1200, 628, PLACEMENTS.filter((p) => p.platform === "meta")).map((x) => x.placement.key);
    expect(keys).toEqual(["facebook-feed", "instagram-feed", "facebook-link-landscape", "threads-feed"]);
  });
});
