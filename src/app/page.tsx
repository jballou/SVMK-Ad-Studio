import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, Trophy, Upload, Plus } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { BandChip, PlatformBadge, TooEarlyChip } from "@/components/ads/badges";
import { HBar } from "@/components/charts/HBar";
import { LineChart } from "@/components/charts/LineChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { Button } from "@/components/ui/button-1";
import { Card, DataTable, PageHeader, Stat } from "@/components/ui/primitives";
import { inRange, pctChange, performanceIndex, rates, shiftDate, sumPoints, totalsByAd, weeklySeries } from "@/lib/analytics/aggregate";
import { fatigueReport } from "@/lib/analytics/fatigue";
import { scoreAll } from "@/lib/analytics/scorecards";
import { getChecks, listBatches, periodFor } from "@/lib/db/repo";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { BAND_LABEL, type Band } from "@/lib/scorecard/score";
import type { PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/ui/colors";

export const metadata = { title: "Dashboard · Ad Studio" };

async function Content() {
  await connection();
  const ws = await loadWorkspace();
  const { ads, daily, pointsByAd, benchmarks, today, asOf, adsByName } = ws;
  const from30 = shiftDate(asOf, -29);
  const prevFrom = shiftDate(asOf, -59);
  const cur = sumPoints(inRange(daily, from30, asOf));
  const prev = sumPoints(inRange(daily, prevFrom, shiftDate(asOf, -30)));
  const rc = rates(cur);
  const rp = rates(prev);

  const totals = totalsByAd(daily);
  const checks = await getChecks(ws.db, periodFor(today));
  const cards = scoreAll(ads, totals, benchmarks, checks, today, ws.gate);
  const batches = (await listBatches(ws.db)).slice(0, 5);

  const live = ads.filter((a) => a.status === "live");
  const fatigue = fatigueReport(ads, pointsByAd, asOf);

  const ranked = ads
    .filter((a) => a.status !== "draft" && cards.get(a.name)?.state === "scored")
    .map((a) => ({ ad: a, idx: performanceIndex(a, totals.get(a.name)!, benchmarks) ?? 0 }))
    .sort((x, y) => y.idx - x.idx);
  const top = ranked.slice(0, 5);
  const bottom = ranked.filter((r) => r.ad.status === "live").slice(-3).reverse();

  const bands = new Map<Band, number>();
  let early = 0;
  for (const a of live) {
    const c = cards.get(a.name);
    if (!c) continue;
    if (c.state === "too-early") early++;
    else bands.set(c.score.band, (bands.get(c.score.band) ?? 0) + 1);
  }
  const attention = [...fatigue.filter((f) => f.level === "fatigued").map((f) => f.ad.name), ...live.filter((a) => cards.get(a.name)?.state === "scored" && (cards.get(a.name) as { score: { band: Band } }).score.band === "refresh-pause").map((a) => a.name)];

  const platforms = ["linkedin", "meta", "display", "newsletter"] as PlatformKey[];
  const since = shiftDate(asOf, -83);
  const ctrByPlatform = platforms.map((p) => ({
    name: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p],
    points: weeklySeries(inRange(daily.filter((d) => adsByName.get(d.adName)?.platform === p), since, asOf), (t) => rates(t).ctr).slice(0, -1),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Performance across ${live.length} live ads. Data as of ${fmtDate(asOf)}; changes compare the last 30 days with the 30 before.`}
        actions={<>
          <Button variant="outline" asChild><Link href="/scorecards"><Upload /> Upload performance</Link></Button>
          <Button asChild><Link href="/batches/new"><Plus /> New batch</Link></Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Spend" value={fmtMoney(cur.spend)} delta={pctChange(cur.spend, prev.spend)} goodWhen="up" href="/performance" />
        <Stat label="Impressions" value={fmtCompact(cur.impressions)} delta={pctChange(cur.impressions, prev.impressions)} href="/performance" />
        <Stat label="CTR" value={fmtPct(rc.ctr)} delta={pctChange(rc.ctr, rp.ctr)} href="/performance/platforms" />
        <Stat label="Conversions" value={cur.conversions.toLocaleString("en-US")} delta={pctChange(cur.conversions, prev.conversions)} href="/performance/platforms" />
        <Stat label="Live ads" value={String(live.length)} sub={`${ads.filter((a) => a.status === "paused").length} paused`} href="/gallery?status=live" />
        <Stat label="Needs attention" value={String(new Set(attention).size)} sub="fatigued or refresh" href="/performance/fatigue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="CTR by platform" description="Weekly click-through rate, last 12 weeks">
          <LineChart label="Weekly CTR by platform" series={ctrByPlatform} unit="pct" />
        </Card>
        <Card title="Scorecard health" description="Live ads by scorecard band" actions={<Link href="/scorecards" className="text-xs font-medium text-brand-green-600 hover:underline">All scorecards</Link>}>
          <HBar
            label="Live ads by scorecard band"
            items={[
              ...(["keep-scale", "monitor-optimize", "optimize-test", "refresh-pause"] as Band[]).map((b) => ({ label: BAND_LABEL[b], value: bands.get(b) ?? 0, color: { "keep-scale": "#08794A", "monitor-optimize": "#7068EB", "optimize-test": "#D07A2F", "refresh-pause": "#AE453F" }[b] })),
              { label: "Too early", value: early, color: "#AFABA1" },
            ]}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Top performers" description="Primary metric vs benchmark (1.0× = at benchmark)" actions={<Trophy className="size-4 text-brand-yellow-500" aria-hidden />} padded={false}>
          <ul className="divide-y divide-brand-neutral-150">
            {top.map(({ ad, idx }) => (
              <li key={ad.id}>
                <Link href={`/gallery/${ad.name}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-periwinkle-500">
                  <span className="w-16 shrink-0"><AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={false} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{ad.name}</span>
                    <span className="mt-0.5 flex items-center gap-2"><PlatformBadge platform={ad.platform} /><span className="text-xs text-brand-neutral-650">{ad.tags.funnel}</span></span>
                  </span>
                  <span className="text-right text-sm tabular-nums"><span className="font-semibold text-brand-green-600">{idx.toFixed(2)}×</span><span className="block text-xs text-brand-neutral-650">CTR {fmtPct(rates(totals.get(ad.name)!).ctr)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Fatigue alerts" description="Live ads whose 7-day CTR is falling from its peak" actions={<AlertTriangle className="size-4 text-brand-orange-500" aria-hidden />} padded={false}>
          {fatigue.length === 0 ? <p className="p-5 text-sm text-brand-neutral-650">No live ads show signs of fatigue.</p> : (
            <ul className="divide-y divide-brand-neutral-150">
              {fatigue.slice(0, 5).map((f) => (
                <li key={f.ad.id}>
                  <Link href={`/gallery/${f.ad.name}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-periwinkle-500">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.ad.name}</span>
                      <span className="text-xs text-brand-neutral-650">{f.daysLive} days live · peak {fmtPct(f.peakCtr)} → now {fmtPct(f.currentCtr)}</span>
                    </span>
                    <Sparkline values={f.series.map((s) => s.y)} color={f.level === "fatigued" ? "#AE453F" : "#D07A2F"} label={`CTR trend for ${f.ad.name}`} />
                    <span className={`w-14 text-right text-sm font-semibold tabular-nums ${f.level === "fatigued" ? "text-brand-red-500" : "text-brand-orange-600"}`}>−{f.declinePct.toFixed(0)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Refresh or pause candidates" description="Live ads furthest below their benchmark" padded={false}>
          <ul className="divide-y divide-brand-neutral-150">
            {bottom.map(({ ad, idx }) => {
              const c = cards.get(ad.name)!;
              return (
                <li key={ad.id}>
                  <Link href={`/gallery/${ad.name}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-periwinkle-500">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{ad.name}</span><PlatformBadge platform={ad.platform} /></span>
                    <span className="text-sm tabular-nums text-brand-red-500">{idx.toFixed(2)}×</span>
                    {c.state === "scored" ? <BandChip band={c.score.band} percent={c.score.percent} /> : <TooEarlyChip />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Recent batches" actions={<Link href="/batches" className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-600 hover:underline">All batches <ArrowRight className="size-3" aria-hidden /></Link>}>
          <DataTable caption="Recent batches" columns={[{ label: "Batch" }, { label: "Ads", align: "right" }, { label: "Created" }]}>
            {batches.map((b) => (
              <tr key={b.id}>
                <td className="py-2.5 pr-3 font-medium"><span className="line-clamp-1">{b.name}</span></td>
                <td className="px-3 py-2.5 text-right tabular-nums">{b.adCount}</td>
                <td className="py-2.5 pl-3 text-brand-neutral-650">{fmtDate(b.createdAt.toISOString())}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading dashboard…</p>}>
      <Content />
    </Suspense>
  );
}
