import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdArt } from "@/components/ads/AdArt";
import { HBar } from "@/components/charts/HBar";
import { Sparkline } from "@/components/charts/Sparkline";
import { Card, DataTable } from "@/components/ui/primitives";
import { RangePicker } from "@/components/ui/range-picker";
import { inRange, performanceIndex, rates, sumPoints, totalsByDimension, weeklySeries } from "@/lib/analytics/aggregate";
import { parseRange, rangeBounds } from "@/lib/analytics/range";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import type { AdRecord } from "@/lib/ads/types";

export const metadata = { title: "Creatives & tags · Ad Studio" };

const DIMS: Record<string, { label: string; pick: (a: AdRecord) => string | string[] }> = {
  concept: { label: "Creative concept", pick: (a) => a.conceptKey },
  persona: { label: "Persona", pick: (a) => a.tags.persona },
  funnel: { label: "Funnel stage", pick: (a) => a.tags.funnel ?? "Untagged" },
  offer: { label: "Offer", pick: (a) => a.tags.offer ?? "Untagged" },
  icp: { label: "ICP", pick: (a) => a.tags.icp ?? [] },
  geo: { label: "Geo", pick: (a) => a.tags.geo ?? [] },
  campaign: { label: "Campaign", pick: (a) => a.campaign ?? "None" },
};

async function Content({ searchParams }: { searchParams: Promise<{ range?: string; by?: string }> }) {
  await connection();
  const [{ range: r, by: byParam }, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const range = parseRange(r);
  const dimKey = byParam && DIMS[byParam] ? byParam : "concept";
  const dim = DIMS[dimKey];
  const b = rangeBounds(range, ws.asOf);
  const pts = inRange(ws.daily, b.from, b.to);
  const groups = [...totalsByDimension(pts, ws.adsByName, dim.pick)].filter(([, t]) => t.impressions > 0).sort(([, x], [, y]) => (rates(y).ctr ?? 0) - (rates(x).ctr ?? 0));
  const adsIn = (k: string) => ws.ads.filter((a) => [dim.pick(a)].flat().includes(k));
  const href = (k: string) => `/performance/creatives?by=${k}&range=${range}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Group by" className="flex flex-wrap gap-1.5">
          {Object.entries(DIMS).map(([k, d]) => (
            <Link key={k} href={href(k)} aria-current={k === dimKey ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-medium ${k === dimKey ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250 bg-white text-brand-neutral-750 hover:bg-brand-neutral-100"}`}>{d.label}</Link>
          ))}
        </nav>
        <RangePicker current={range} basePath="/performance/creatives" extra={{ by: dimKey }} />
      </div>

      {dimKey !== "concept" && (
        <Card title={`CTR by ${dim.label.toLowerCase()}`}>
          <HBar label={`CTR by ${dim.label}`} items={groups.map(([k, t]) => ({ label: k, value: rates(t).ctr ?? 0, sub: `${fmtCompact(t.impressions)} impr` }))} format={(n) => `${n.toFixed(2)}%`} />
        </Card>
      )}

      <Card title={`By ${dim.label.toLowerCase()}`} description="Sorted by CTR. Tags are multi-valued, so an ad with two personas counts in both." padded={false}>
        <div className="px-5 py-3">
          <DataTable caption={`Performance by ${dim.label}`} columns={[{ label: dim.label }, { label: "Ads", align: "right" }, { label: "Spend", align: "right" }, { label: "Impr.", align: "right" }, { label: "CTR", align: "right" }, { label: "Cost / conv.", align: "right" }, ...(dimKey === "concept" ? [{ label: "Trend" }] : [])]}>
            {groups.map(([k, t]) => {
              const rr = rates(t);
              const ads = adsIn(k);
              const first = ads.find((a) => a.art) ?? ads[0];
              const trend = dimKey === "concept" ? weeklySeries(pts.filter((p) => ws.adsByName.get(p.adName)?.conceptKey === k), (x) => rates(x).ctr).map((p) => p.y) : [];
              const idx = ads.length ? performanceIndex(ads[0], sumPoints(pts.filter((p) => ads.some((a) => a.name === p.adName))), ws.benchmarks) : undefined;
              return (
                <tr key={k}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3">
                      {dimKey === "concept" && first && <span className="w-12 shrink-0 overflow-hidden rounded border border-brand-neutral-200"><AdArt art={first.art} copy={first.copy} width={first.width} height={first.height} showCta={false} /></span>}
                      <span><span className="font-medium">{k}</span>{dimKey === "concept" && first?.copy && <span className="block max-w-xs truncate text-xs text-brand-neutral-650">{first.copy.headline}</span>}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right tabular-nums">{ads.length}</td>
                  <td className="px-3 text-right tabular-nums">{fmtMoney(t.spend)}</td>
                  <td className="px-3 text-right tabular-nums">{fmtCompact(t.impressions)}</td>
                  <td className="px-3 text-right tabular-nums">{fmtPct(rr.ctr)}{idx !== undefined && dimKey === "concept" && <span className={`block text-xs ${idx >= 1 ? "text-brand-green-600" : "text-brand-red-500"}`}>{idx.toFixed(2)}× bench.</span>}</td>
                  <td className="px-3 text-right tabular-nums">{rr.cpa === undefined ? "—" : fmtMoney(rr.cpa, 2)}</td>
                  {dimKey === "concept" && <td className="py-2.5 pl-3"><Sparkline values={trend} label={`Weekly CTR for ${k}`} /></td>}
                </tr>
              );
            })}
          </DataTable>
        </div>
      </Card>
    </div>
  );
}

export default function Creatives({ searchParams }: { searchParams: Promise<{ range?: string; by?: string }> }) {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading creatives…</p>}><Content searchParams={searchParams} /></Suspense>;
}
