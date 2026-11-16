import { describe, expect, it } from "vitest";
import { decodeExport, derive, importMetrics, parseCsv, totalsByAd } from "./csv";

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

describe("LinkedIn Campaign Manager export", () => {
  const body = [
    "Ad Performance Report",
    "Date range: 11/01/2026 - 11/07/2026",
    "",
    ["Start Date (in UTC)", "Campaign Name", "Creative Name", "Creative ID", "Impressions", "Clicks", "Total Spent", "Leads", "Conversions"].join("\t"),
    ["11/01/2026", "Q4", "Stat card", "urn:li:sponsoredCreative:123", "12,000", "150", "$310.25", "4", "9"].join("\t"),
    ["11/02/2026", "Q4", "Stat card", "urn:li:sponsoredCreative:123", "9,000", "90", "$200", "2", "3"].join("\t"),
    ["", "", "", "", "21000", "240", "510.25", "6", "12"].join("\t"),
  ].join("\r\n");

  it("skips report preamble, reads tab-separated data, takes the creative ID, prefers Conversions over Leads and ignores the totals row", () => {
    const r = importMetrics(body);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ adName: "Stat card", externalId: "urn:li:sponsoredCreative:123", day: "2026-11-01", spend: 310.25, impressions: 12000, clicks: 150, conversions: 9 });
  });
  it("decodes UTF-16 exports", () => {
    const u16 = new Uint16Array([0xfeff, ...[...body].map((c) => c.charCodeAt(0))]);
    expect(importMetrics(decodeExport(u16.buffer)).rows).toHaveLength(2);
  });
  it("keeps a row that has an ID but no name, and uses the ID as its name", () => {
    const r = importMetrics(["Start Date (in UTC)\tAd Name\tAd ID\tImpressions\tTotal Spent", "11/01/2026\t\t555\t100\t$5"].join("\n"));
    expect(r.rows).toEqual([expect.objectContaining({ adName: "555", externalId: "555", impressions: 100, spend: 5 })]);
  });
});
