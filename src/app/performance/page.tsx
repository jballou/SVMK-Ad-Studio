import { connection } from "next/server";
import { AdRow } from "@/components/ads/AdRow";
import { LineChart } from "@/components/charts/LineChart";
import { Card, Stat } from "@/components/ui/primitives";
import { RangePicker } from "@/components/ui/range-picker";
import { inRange, pctChange, performanceIndex, rates, sumPoints, totalsByAd, weeklySeries } from "@/lib/analytics/aggregate";
import { parseRange, rangeBounds } from "@/lib/analytics/range";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import type { PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/ui/colors";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Performance · Ad Studio" };
const MIN_IMPRESSIONS = 20_000;

async function Content({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection();
  const [{ range: r }, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const range = parseRange(r);
  const b = rangeBounds(range, ws.asOf);
  const pts = inRange(ws.daily, b.from, b.to);
  const prevPts = b.prevFrom ? inRange(ws.daily, b.prevFrom, b.prevTo!) : [];
  const cur = sumPoints(pts);
  const prev = sumPoints(prevPts);
  const rc = rates(cur);
  const rp = rates(prev);

  const totals = totalsByAd(pts);
  const ranked = ws.ads
    .flatMap((ad) => {
      const t = totals.get(ad.name);
      const idx = t && t.impressions >= MIN_IMPRESSIONS ? performanceIndex(ad, t, ws.benchmarks) : undefined;
      return idx === undefined ? [] : [{ ad, idx, ctr: rates(t!).ctr }];
    })
    .sort((a, b2) => b2.idx - a.idx);

  const platforms = ["linkedin", "meta", "display", "newsletter"] as PlatformKey[];
  const spend = platforms.map((p) => ({ name: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p], points: weeklySeries(pts.filter((d) => ws.adsByName.get(d.adName)?.platform === p), (t) => t.spend).slice(0, -1) }));
  const hasPrev = prevPts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-neutral-650">{hasPrev ? "Changes compare with the previous period of the same length." : "No earlier period to compare with."}</p>
        <RangePicker current={range} basePath="/performance" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Spend" value={fmtMoney(cur.spend)} delta={hasPrev ? pctChange(cur.spend, prev.spend) : undefined} />
        <Stat label="Impressions" value={fmtCompact(cur.impressions)} delta={hasPrev ? pctChange(cur.impressions, prev.impressions) : undefined} />
        <Stat label="CTR" value={fmtPct(rc.ctr)} delta={hasPrev ? pctChange(rc.ctr, rp.ctr) : undefined} />
        <Stat label="Cost per conversion" value={rc.cpa === undefined ? "—" : fmtMoney(rc.cpa, 2)} delta={hasPrev ? pctChange(rc.cpa, rp.cpa) : undefined} goodWhen="down" />
      </div>
      <Card title="Weekly spend by platform"><LineChart label="Weekly spend by platform" unit="usd" series={spend} area /></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Winners" description={`Highest primary metric vs benchmark, min ${fmtCompact(MIN_IMPRESSIONS)} impressions`} padded={false}>
          <ul className="divide-y divide-brand-neutral-150">{ranked.slice(0, 8).map(({ ad, idx, ctr }) => <li key={ad.id}><AdRow ad={ad} showStatus right={<span className="text-right text-sm tabular-nums"><span className="font-semibold text-brand-green-600">{idx.toFixed(2)}×</span><span className="block text-xs text-brand-neutral-650">CTR {fmtPct(ctr)}</span></span>} /></li>)}</ul>
        </Card>
        <Card title="Losers" description="Lowest primary metric vs benchmark" padded={false}>
          <ul className="divide-y divide-brand-neutral-150">{ranked.slice(-8).reverse().map(({ ad, idx, ctr }) => <li key={ad.id}><AdRow ad={ad} showStatus right={<span className="text-right text-sm tabular-nums"><span className="font-semibold text-brand-red-500">{idx.toFixed(2)}×</span><span className="block text-xs text-brand-neutral-650">CTR {fmtPct(ctr)}</span></span>} /></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}

export default function Overview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  return <Loadable><Content searchParams={searchParams} /></Loadable>;
}
