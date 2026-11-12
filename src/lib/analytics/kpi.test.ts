import { describe, expect, it } from "vitest";
import { kpiForStage, rankByStageKpi } from "./kpi";

const ad = (name: string, funnel?: string) => ({ name, tags: { persona: [], funnel } });
const t = (spend: number, impressions: number, clicks: number, conversions: number) => ({ spend, impressions, clicks, conversions });

describe("stage KPIs", () => {
  it("maps stages to their KPI", () => {
    expect(kpiForStage("Brand Awareness").metric).toBe("cpm");
    expect(kpiForStage("Awareness").metric).toBe("cpm");
    expect(kpiForStage("Interest").metric).toBe("cpc");
    expect(kpiForStage("T2E").label).toBe("CPA (MQL)");
    expect(kpiForStage(undefined).metric).toBe("ctr");
  });
  it("ranks lower-is-better KPIs ascending and skips thin data", () => {
    const totals = new Map([["a", t(100, 50_000, 500, 10)], ["b", t(60, 50_000, 500, 10)], ["c", t(1, 100, 1, 1)]]);
    const out = rankByStageKpi([ad("a", "Consideration"), ad("b", "Consideration"), ad("c", "Consideration")], totals, 20_000);
    expect(out.map((r) => r.ad.name)).toEqual(["b", "a"]);
  });
});
