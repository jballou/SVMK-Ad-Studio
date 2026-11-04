import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronLeft, CircleCheck, CircleX, Download } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { BandChip, PlatformBadge, StatusChip, TooEarlyChip } from "@/components/ads/badges";
import { LineChart } from "@/components/charts/LineChart";
import { StatusControl, TagEditor } from "@/components/gallery/AdControls";
import { PreviewSwitcher } from "@/components/gallery/PreviewSwitcher";
import { Button } from "@/components/ui/button-1";
import { Card, Stat } from "@/components/ui/primitives";
import { dailySeries, rates, sumPoints, totalsByAd } from "@/lib/analytics/aggregate";
import { assessFatigue } from "@/lib/analytics/fatigue";
import { scoreAll } from "@/lib/analytics/scorecards";
import { getChecks, periodFor } from "@/lib/db/repo";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { MAX_POINTS, type Criterion } from "@/lib/scorecard/score";
import { PLACEMENTS } from "@/lib/specs/platforms";
import { PLATFORM_COLOR } from "@/lib/ui/colors";

const CRITERIA: [Criterion, string][] = [
  ["campaignActive", "Part of an active campaign"], ["landingPageClear", "Landing page messaging is clear"], ["ctaMatch", "CTA matches landing page"], ["icpMatch", "Messaging is ICP-specific and targeting matches"],
  ["underNinetyDays", "In market under 90 days"], ["primaryMetrics", "Primary metrics beat benchmarks"], ["secondaryMetrics", "Secondary metrics beat benchmarks"], ["topPerformer", "Top performer in its group"],
];

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: `${decodeURIComponent((await params).name)} · Ad Studio` };
}

async function Content({ params }: { params: Promise<{ name: string }> }) {
  await connection();
  const name = decodeURIComponent((await params).name);
  const ws = await loadWorkspace();
  const ad = ws.adsByName.get(name);
  if (!ad) notFound();

  const points = ws.pointsByAd.get(name) ?? [];
  const t = sumPoints(points);
  const r = rates(t);
  const fatigue = assessFatigue(ad, points, ws.asOf);
  const checks = await getChecks(ws.db, periodFor(ws.today));
  const card = scoreAll(ws.ads, totalsByAd(ws.daily), ws.benchmarks, checks, ws.today, ws.gate).get(name);
  const siblings = ws.ads.filter((a) => a.conceptKey === ad.conceptKey && a.name !== name);
  const placement = PLACEMENTS.find((p) => p.key === ad.placement);
  const copy = ad.copy;
  const limit = placement?.copyLimits ?? [];
  const lim = (f: string) => limit.find((l) => l.field === f)?.max;

  const ctr = dailySeries(points, (x) => rates(x).ctr);
  const impressions = dailySeries(points, (x) => x.impressions);
  const rolling = fatigue?.series ?? [];

  return (
    <>
      <Link href="/gallery" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-neutral-650 hover:text-brand-neutral-900"><ChevronLeft className="size-4" aria-hidden /> Ad gallery</Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-all text-2xl font-semibold tracking-tight">{ad.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusChip status={ad.status} /><PlatformBadge platform={ad.platform} />
            <span className="text-sm text-brand-neutral-650">{placement?.label ?? ad.placement} · {ad.width}×{ad.height}</span>
            <span className="text-sm text-brand-neutral-650">{ad.campaign}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusControl name={ad.name} status={ad.status} />
          <Button variant="outline" asChild><Link href={`/export?ads=${encodeURIComponent(ad.name)}`}><Download /> Export</Link></Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          <Card title="Preview" description="The creative inside the platform UI. Platform text comes from the copy deck."><PreviewSwitcher ad={ad} /></Card>
          {siblings.length > 0 && (
            <Card title={`Other sizes of ${ad.conceptKey}`} description="Same concept, other platforms and sizes">
              <ul className="flex flex-wrap items-end gap-3">
                {siblings.map((s) => (
                  <li key={s.id} className="w-24"><Link href={`/gallery/${s.name}`} className="block space-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500">
                    <span className="block overflow-hidden rounded border border-brand-neutral-200"><AdArt art={s.art} copy={s.copy} width={s.width} height={s.height} showCta={false} /></span>
                    <span className="block truncate text-[11px] text-brand-neutral-650" title={s.name}>{s.width}×{s.height} · {s.platform}</span>
                  </Link></li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {points.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Impressions" value={fmtCompact(t.impressions)} />
                <Stat label="CTR" value={fmtPct(r.ctr)} sub={fatigue && fatigue.level !== "healthy" ? `−${fatigue.declinePct.toFixed(0)}% from peak` : undefined} />
                <Stat label="CPC" value={r.cpc === undefined ? "—" : fmtMoney(r.cpc, 2)} />
                <Stat label="Spend" value={fmtMoney(t.spend)} />
                <Stat label="Conversions" value={t.conversions.toLocaleString("en-US")} />
                <Stat label="Cost / conv." value={r.cpa === undefined ? "—" : fmtMoney(r.cpa, 2)} />
              </div>
              <Card title="Click-through rate" description={fatigue ? `7-day rolling CTR, peak ${fmtPct(fatigue.peakCtr)}, now ${fmtPct(fatigue.currentCtr)}` : "Daily CTR"}>
                <LineChart label={`CTR over time for ${ad.name}`} unit="pct" series={[{ name: rolling.length ? "7-day CTR" : "Daily CTR", color: PLATFORM_COLOR[ad.platform], points: rolling.length ? rolling : ctr }]} area />
              </Card>
              <Card title="Impressions per day"><LineChart label={`Daily impressions for ${ad.name}`} unit="compact" series={[{ name: "Impressions", color: "#908D89", points: impressions }]} height={170} area /></Card>
            </>
          ) : (
            <Card title="Performance"><p className="text-sm text-brand-neutral-650">This ad hasn&apos;t launched yet. Upload performance once it goes live and it will appear here.</p></Card>
          )}

          <Card title="Scorecard" actions={<Link href="/scorecards" className="text-xs font-medium text-brand-green-600 hover:underline">Open scorecards</Link>}>
            {card?.state === "scored" ? (
              <div className="space-y-3">
                <BandChip band={card.score.band} percent={card.score.percent} />
                <ul className="space-y-1.5 text-sm">
                  {CRITERIA.map(([k, label]) => {
                    const v = card.criteria[k];
                    return (
                      <li key={k} className="flex items-center gap-2">
                        {v === null ? <span aria-hidden className="w-4 text-center text-brand-neutral-550">—</span> : v ? <CircleCheck aria-hidden className="size-4 text-brand-green-600" /> : <CircleX aria-hidden className="size-4 text-brand-red-500" />}
                        <span className="flex-1">{label}</span>
                        <span className="text-xs tabular-nums text-brand-neutral-650">{v === null ? "n/a" : `${v ? MAX_POINTS[k] : 0}/${MAX_POINTS[k]}`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : card?.state === "too-early" ? (
              <div className="space-y-2"><TooEarlyChip /><p className="text-sm text-brand-neutral-650">Learning phase: {card.daysLive}/{card.gate.minDays} days and {card.impressions.toLocaleString("en-US")}/{card.gate.minImpressions.toLocaleString("en-US")} impressions. The score is withheld until both are met.</p></div>
            ) : <p className="text-sm text-brand-neutral-650">Not scored: this ad hasn&apos;t launched.</p>}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Copy" description={`From the copy deck · ${ad.campaign}`}>
          {copy ? (
            <dl className="space-y-3 text-sm">
              {([["In-image headline", copy.headline, undefined], ["Intro text", copy.intro, lim("intro")], ["Platform headline", copy.platformHeadline, lim("headline")], ["CTA", copy.cta, undefined], ["Landing page", copy.landing, undefined]] as [string, string, number | undefined][]).map(([k, v, max]) => (
                <div key={k}><dt className="text-xs font-medium text-brand-neutral-650">{k}</dt><dd className="mt-0.5">{v}{max !== undefined && <span className={`ml-2 text-xs tabular-nums ${v.length > max ? "text-brand-red-500" : "text-brand-neutral-550"}`}>{v.length}/{max}</span>}</dd></div>
              ))}
            </dl>
          ) : <p className="text-sm text-brand-neutral-650">No copy linked.</p>}
        </Card>
        <Card title="Tags" description="Persona, funnel stage, and targeting used in filters and reports"><TagEditor key={JSON.stringify(ad.tags)} name={ad.name} tags={ad.tags} taxonomy={ws.taxonomy} /></Card>
      </div>
      <p className="mt-6 text-xs text-brand-neutral-550">Launched {fmtDate(ad.launchedAt)}{ad.pausedAt ? ` · paused ${fmtDate(ad.pausedAt)}` : ""}</p>
    </>
  );
}

export default function AdDetail({ params }: { params: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading ad…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
