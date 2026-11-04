import { describe, expect, it } from "vitest";
import { derive, importMetrics, parseCsv, totalsByAd } from "./csv";

const csv = `Date,Ad Name,Amount Spent,Impressions,Clicks,Leads
2026-08-12,A072025_1200x1200,"$1,200.50","100,000",1500,30
08/13/2026,A072025_1200x1200,100,10000,100,2
2026-08-13,Other_1x1,5,500,5,0
bad,A072025_1200x1200,1,1,1,1
`;

describe("parseCsv", () => {
  it("handles quotes, commas, CRLF and BOM", () => {
    expect(parseCsv('﻿a,"b,c"\r\n"x""y",z')).toEqual([["a", "b,c"], ['x"y', "z"]]);
  });
});

describe("importMetrics", () => {
  it("maps headers, parses currency/dates, reports bad rows and unmatched names", () => {
    const r = importMetrics(csv, ["A072025_1200x1200"]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toMatchObject({ day: "2026-08-12", spend: 1200.5, impressions: 100000, conversions: 30 });
    expect(r.rows[1].day).toBe("2026-08-13");
    expect(r.errors).toEqual([{ line: 5, message: 'Unrecognized date "bad"' }]);
    expect(r.unmatchedNames).toEqual(["Other_1x1"]);
  });
  it("requires core columns", () => {
    expect(importMetrics("a,b\n1,2").errors[0].message).toMatch(/adName/);
  });
});

describe("totals and derived metrics", () => {
  it("aggregates per ad", () => {
    const t = totalsByAd(importMetrics(csv).rows)["A072025_1200x1200"];
    expect(t).toMatchObject({ impressions: 110000, clicks: 1600, conversions: 32 });
    expect(derive(t, "ctr")).toBeCloseTo(1.4545, 3);
    expect(derive({ spend: 1, impressions: 0, clicks: 0, conversions: 0 }, "cpc")).toBeUndefined();
  });
});

describe("video columns", () => {
  it("reads video starts/completions when present and leaves them off otherwise", () => {
    const withVideo = importMetrics("Date,Ad Name,Impressions,Video Starts,Video Completions\n2026-10-01,A,1000,400,120");
    expect(withVideo.rows[0]).toMatchObject({ videoStarts: 400, videoCompletions: 120 });
    const without = importMetrics("Date,Ad Name,Impressions\n2026-10-01,A,1000");
    expect(without.rows[0].videoStarts).toBeUndefined();
  });
});
