import { connection } from "next/server";
import { LineChart } from "@/components/charts/LineChart";
import { Card, DataTable } from "@/components/ui/primitives";
import { RangePicker } from "@/components/ui/range-picker";
import { inRange, rates, totalsByDimension, weeklySeries } from "@/lib/analytics/aggregate";
import { parseRange, rangeBounds } from "@/lib/analytics/range";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtInt, fmtMoney, fmtPct } from "@/lib/format";
import { PLACEMENTS, type PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/ui/colors";
import type { Totals } from "@/lib/metrics/csv";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Platforms · Ad Studio" };

function Row({ label, sub, t, ads }: { label: string; sub?: string; t: Totals; ads?: string }) {
  const r = rates(t);
  return (
    <tr>
      <td className="py-2.5 pr-3 font-medium">{label}{sub && <span className="block text-xs font-normal text-brand-neutral-650">{sub}</span>}</td>
      {ads !== undefined && <td className="px-3 text-right tabular-nums">{ads}</td>}
      <td className="px-3 text-right tabular-nums">{fmtMoney(t.spend)}</td>
      <td className="px-3 text-right tabular-nums">{fmtCompact(t.impressions)}</td>
      <td className="px-3 text-right tabular-nums">{fmtPct(r.ctr)}</td>
      <td className="px-3 text-right tabular-nums">{r.cpc === undefined ? "—" : fmtMoney(r.cpc, 2)}</td>
      <td className="px-3 text-right tabular-nums">{fmtPct(r.cvr, 1)}</td>
      <td className="py-2.5 pl-3 text-right tabular-nums">{r.cpa === undefined ? "—" : fmtMoney(r.cpa, 2)}</td>
    </tr>
  );
}

const cols = (first: string, withAds = false) => [{ label: first }, ...(withAds ? [{ label: "Ads", align: "right" as const }] : []), { label: "Spend", align: "right" as const }, { label: "Impr.", align: "right" as const }, { label: "CTR", align: "right" as const }, { label: "CPC", align: "right" as const }, { label: "CVR", align: "right" as const }, { label: "Cost / conv.", align: "right" as const }];

async function Content({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection();
  const [{ range: r }, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const range = parseRange(r);
  const b = rangeBounds(range, ws.asOf);
  const pts = inRange(ws.daily, b.from, b.to);
  const by = (dim: Parameters<typeof totalsByDimension>[2]) => [...totalsByDimension(pts, ws.adsByName, dim)].sort(([, x], [, y]) => y.spend - x.spend);
  const platforms = ["linkedin", "meta", "display", "newsletter"] as PlatformKey[];
  const adCount = (f: (a: (typeof ws.ads)[number]) => boolean) => ws.ads.filter((a) => a.status === "live" && f(a)).length;
  const sizes = by((a) => `${a.width}×${a.height}`).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><RangePicker current={range} basePath="/performance/platforms" /></div>
      <Card title="By platform" padded={false}>
        <div className="px-5 py-3"><DataTable caption="Performance by platform" columns={cols("Platform", true)}>
          {by((a) => a.platform).map(([k, t]) => <Row key={k} label={PLATFORM_LABEL[k as PlatformKey]} t={t} ads={`${adCount((a) => a.platform === k)} live`} />)}
        </DataTable></div>
      </Card>
      <Card title="CTR trend" description="Weekly click-through rate by platform">
        <LineChart label="Weekly CTR by platform" unit="pct" series={platforms.map((p) => ({ name: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p], points: weeklySeries(pts.filter((d) => ws.adsByName.get(d.adName)?.platform === p), (t) => rates(t).ctr).slice(0, range === "all" ? undefined : -1) }))} />
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="By placement" description="Which platform surfaces earn their spend" padded={false}>
          <div className="px-5 py-3"><DataTable caption="Performance by placement" columns={cols("Placement")}>
            {by((a) => a.placement).map(([k, t]) => <Row key={k} label={PLACEMENTS.find((p) => p.key === k)?.label ?? k} t={t} />)}
          </DataTable></div>
        </Card>
        <Card title="By creative size" description="Top 10 sizes by spend" padded={false}>
          <div className="px-5 py-3"><DataTable caption="Performance by size" columns={cols("Size")}>
            {sizes.map(([k, t]) => <Row key={k} label={k} sub={`${fmtInt(t.impressions)} impressions`} t={t} />)}
          </DataTable></div>
        </Card>
      </div>
    </div>
  );
}

export default function Platforms({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  return <Loadable><Content searchParams={searchParams} /></Loadable>;
}
