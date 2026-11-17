import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import type { MetricRow, SourceAd } from "@/lib/metrics/csv";
import { runPerformanceImport } from "./performance-import";
import { createBatch, getDailyMetrics, listAds } from "./repo";

vi.mock("server-only", () => ({}));

let db: Db;
beforeAll(async () => {
  const d = drizzle(new PGlite(), { schema });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as Db;
  // An ad built in Ad Studio, which a LinkedIn export will refer to by its own name.
  await createBatch(db, {
    name: "seed", createdBy: "t", placements: ["linkedin-single-image"],
    concepts: [{ key: "Existing", tags: { persona: [] } }],
    ads: [{ conceptKey: "Existing", name: "Existing062026_1200x628", platform: "linkedin", placement: "linkedin-single-image", width: 1200, height: 628, tags: { persona: [] } }],
  });
}, 60_000);

const src = (over: Partial<SourceAd> & { key: string; name: string }): SourceAd => ({ impressions: 1000, status: "Active", kind: "Sponsored Update", adSet: "SVMK_LI_Evergreen_US_EN_Core_Marketing_Interest_RT_In-Feed_", objective: "Website visits", firstDay: "2026-11-02", lastDay: "2026-11-03", ...over });
const row = (name: string, id: string, day: string, impressions: number, spend = 10): MetricRow => ({ adName: name, externalId: id, day, spend, impressions, clicks: 5, conversions: 1 });

const NEW = "LI_Carousel_333WoomWanted012026_Design_Static_1080x1080_Feb_V1";
const MATCH = "LI_In-Feed_Existing062026_Design_Static_1200x628_June_V1";

describe("runPerformanceImport", () => {
  it("creates unknown ads from their names, matches existing ones by concept + month + size, skips Message ads, and asks nothing", async () => {
    const res = await runPerformanceImport(db, {
      platform: "linkedin",
      ads: [src({ key: "1", externalId: "1", name: NEW }), src({ key: "2", externalId: "2", name: MATCH }), src({ key: "3", externalId: "3", name: "Build a data-informed strategy", kind: "Sponsored Messaging" })],
      rows: [row(NEW, "1", "2026-11-02", 1000), row(NEW, "1", "2026-11-03", 900), row(MATCH, "2", "2026-11-02", 500), row("Build a data-informed strategy", "3", "2026-11-02", 50)],
    });
    expect(res.status).toBe("done");
    if (res.status !== "done") return;
    expect(res.summary).toMatchObject({ created: 1, matched: 1, days: 3, impressions: 2400 });
    expect(res.summary.skipped).toEqual([{ name: "Build a data-informed strategy", reason: "Message ad (no image size)" }]);

    const made = (await listAds(db)).find((a) => a.name === NEW)!;
    expect(made).toMatchObject({ platform: "linkedin", adType: "Carousel", stage: "Interest", geo: "US", width: 1080, height: 1080, status: "live" });
    expect(made.tags.persona).toEqual(["Marketing"]);
    expect(made.launchedAt).toBe("2026-11-02");
    expect((await getDailyMetrics(db)).filter((d) => d.adName === "Existing062026_1200x628")).toHaveLength(1);
  });

  it("is quiet when the same file is uploaded again, and links by ID so a renamed ad still matches", async () => {
    const again = await runPerformanceImport(db, { platform: "linkedin", ads: [src({ key: "1", externalId: "1", name: NEW + "_renamed" })], rows: [row(NEW + "_renamed", "1", "2026-11-02", 1000), row(NEW + "_renamed", "1", "2026-11-03", 900)] });
    expect(again).toMatchObject({ status: "done", summary: { created: 0, matched: 1, days: 2 } });
  });

  it("asks only when stored numbers disagree, then honors the answer", async () => {
    const input = { platform: "linkedin", ads: [src({ key: "1", externalId: "1", name: NEW })], rows: [row(NEW, "1", "2026-11-02", 1200)] };
    const ask = await runPerformanceImport(db, input);
    expect(ask).toMatchObject({ status: "needs-decisions", conflicts: [{ kind: "data", days: 1, ads: 1 }] });
    const keep = await runPerformanceImport(db, { ...input, decisions: { data: "keep" } });
    expect(keep).toMatchObject({ status: "done", summary: { days: 0, keptDays: 1 } });
    expect((await getDailyMetrics(db)).find((d) => d.adName === NEW && d.day === "2026-11-02")?.impressions).toBe(1000);
    await runPerformanceImport(db, { ...input, decisions: { data: "replace" } });
    expect((await getDailyMetrics(db)).find((d) => d.adName === NEW && d.day === "2026-11-02")?.impressions).toBe(1200);
  });

  it("asks which ad when two Ad Studio ads fit one LinkedIn ad", async () => {
    await createBatch(db, {
      name: "dupes", createdBy: "t", placements: ["linkedin-single-image"],
      concepts: [{ key: "Twin", tags: { persona: [] } }, { key: "twin", tags: { persona: [] } }],
      ads: [
        { conceptKey: "Twin", name: "Twin062026_1200x1200", platform: "linkedin", placement: "linkedin-single-image", width: 1200, height: 1200, tags: { persona: [] } },
        { conceptKey: "twin", name: "twin062026_1200x1200", platform: "linkedin", placement: "linkedin-single-image", width: 1200, height: 1200, tags: { persona: [] } },
      ],
    });
    const name = "LI_static_Twin062026_Design_Static_1200x1200_June_";
    const input = { platform: "linkedin", ads: [src({ key: "9", externalId: "9", name })], rows: [row(name, "9", "2026-11-04", 10)] };
    const ask = await runPerformanceImport(db, input);
    expect(ask).toMatchObject({ status: "needs-decisions", conflicts: [{ kind: "ambiguous", key: "9" }] });
    const done = await runPerformanceImport(db, { ...input, decisions: { pick: { "9": "twin062026_1200x1200" } } });
    expect(done).toMatchObject({ status: "done", summary: { matched: 1, created: 0 } });
  });
});
