import { connection } from "next/server";
import { AdRow } from "@/components/ads/AdRow";
import { LineChart } from "@/components/charts/LineChart";
import { FilterBar } from "@/components/ui/filter-bar";
import { Card, EmptyState, Stat } from "@/components/ui/primitives";
import { RangePicker } from "@/components/ui/range-picker";
import { inRange, pctChange, rates, sumPoints, totalsByAd, weeklySeries } from "@/lib/analytics/aggregate";
import { fmtKpi, kpiForStage, rankByStageKpi, STAGE_KPIS } from "@/lib/analytics/kpi";
import { customBounds, parseRange, rangeBounds } from "@/lib/analytics/range";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import type { PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/ui/colors";
import { platformKeys } from "@/lib/specs/platforms";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Performance · Ad Studio" };
const MIN_IMPRESSIONS = 20_000;

type Search = { range?: string; platform?: string; from?: string; to?: string };

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const [q, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const range = parseRange(q.range);
  const platform = q.platform && q.platform in PLATFORM_LABEL ? (q.platform as PlatformKey) : undefined;
  const custom = customBounds(q.from, q.to);
  const b = custom ?? rangeBounds(range, ws.asOf);
  const inPlatform = (name: string) => !platform || ws.adsByName.get(name)?.platform === platform;
  const pts = inRange(ws.daily, b.from, b.to).filter((d) => inPlatform(d.adName));
  const prevPts = b.prevFrom ? inRange(ws.daily, b.prevFrom, b.prevTo!).filter((d) => inPlatform(d.adName)) : [];
  const cur = sumPoints(pts);
  const prev = sumPoints(prevPts);
  const rc = rates(cur);
  const rp = rates(prev);

  const totals = totalsByAd(pts);
  const ads = ws.ads.filter((a) => !platform || a.platform === platform);
  const ranked = rankByStageKpi(ads, totals, MIN_IMPRESSIONS);
  const byStage = STAGE_KPIS.map((k) => k.stage).concat("Untagged")
    .map((stage) => ({ stage, kpi: kpiForStage(stage === "Untagged" ? undefined : stage), rows: ranked.filter((r) => (r.ad.tags.funnel ? r.kpi.stage : "Untagged") === stage) }))
    .filter((g, i, all) => g.rows.length > 0 && all.findIndex((x) => x.stage === g.stage) === i);

  const platforms = platformKeys().filter((p) => !platform || p === platform);
  const spend = platforms.map((p) => ({ name: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p], points: weeklySeries(pts.filter((d) => ws.adsByName.get(d.adName)?.platform === p), (t) => t.spend).slice(0, -1) }));
  const hasPrev = prevPts.length > 0;
  const extra = { platform, from: undefined, to: undefined };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterBar basePath="/performance" platform={platform} from={custom?.from} to={custom?.to} />
        {!custom && <RangePicker current={range} basePath="/performance" extra={extra} />}
      </div>
      <p className="text-sm text-brand-neutral-650">
        {platform ? `${PLATFORM_LABEL[platform]} only. ` : ""}{custom ? `${custom.from} to ${custom.to}. ` : ""}
        {hasPrev ? "Changes compare with the previous period of the same length." : "No earlier period to compare with."}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Spend" value={fmtMoney(cur.spend)} delta={hasPrev ? pctChange(cur.spend, prev.spend) : undefined} />
        <Stat label="Impressions" value={fmtCompact(cur.impressions)} delta={hasPrev ? pctChange(cur.impressions, prev.impressions) : undefined} />
        <Stat label="CTR" value={fmtPct(rc.ctr)} delta={hasPrev ? pctChange(rc.ctr, rp.ctr) : undefined} />
        <Stat label="Cost per conversion" value={rc.cpa === undefined ? "—" : fmtMoney(rc.cpa, 2)} delta={hasPrev ? pctChange(rc.cpa, rp.cpa) : undefined} goodWhen="down" />
      </div>
      <Card title={platform ? `Weekly spend, ${PLATFORM_LABEL[platform]}` : "Weekly spend by platform"}><LineChart label="Weekly spend by platform" unit="usd" series={spend} area /></Card>
      <div>
        <h2 className="text-base font-semibold text-brand-neutral-900">Top performers by funnel stage</h2>
        <p className="mt-1 text-sm text-brand-neutral-650">Each stage is judged on its own KPI, min {fmtCompact(MIN_IMPRESSIONS)} impressions. Not final: confirm with channel leads once 2027 strategy is set.</p>
      </div>
      {byStage.length === 0 ? <EmptyState title="No ads with enough data" body="Try a longer date range or another platform." /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {byStage.map(({ stage, kpi, rows }) => (
            <Card key={stage} title={stage} description={`${kpi.label}, ${kpi.direction === "lower" ? "lower is better" : "higher is better"}${kpi.note ? `. ${kpi.note}` : ""}`} padded={false}>
              <ul className="divide-y divide-brand-neutral-150">
                {rows.slice(0, 3).map(({ ad, value }) => <li key={ad.id}><AdRow ad={ad} showStatus right={<span className="text-right text-sm tabular-nums"><span className="font-semibold text-brand-green-600">{fmtKpi(kpi.metric, value)}</span><span className="block text-xs text-brand-neutral-650">{kpi.label}</span></span>} /></li>)}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Overview({ searchParams }: { searchParams: Promise<Search> }) {
  return <Loadable><Content searchParams={searchParams} /></Loadable>;
}
