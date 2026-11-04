import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { AdRow } from "@/components/ads/AdRow";
import { LineChart } from "@/components/charts/LineChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { Card, EmptyState, Stat } from "@/components/ui/primitives";
import { fatigueReport, FATIGUE_THRESHOLDS } from "@/lib/analytics/fatigue";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtPct } from "@/lib/format";
import { SERIES_COLORS } from "@/lib/ui/colors";
import { daysLive } from "@/lib/scorecard/build";

export const metadata = { title: "Fatigue · Ad Studio" };

async function Content() {
  await connection();
  const ws = await loadWorkspace();
  const report = fatigueReport(ws.ads, ws.pointsByAd, ws.asOf);
  const fatigued = report.filter((r) => r.level === "fatigued");
  const approaching = report.filter((r) => r.level === "approaching");
  const old = ws.ads.filter((a) => a.status === "live" && daysLive(a, ws.asOf) >= 75).sort((a, b) => daysLive(b, ws.asOf) - daysLive(a, ws.asOf));
  const worst = report.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fatigued" value={String(fatigued.length)} sub={`CTR down ${FATIGUE_THRESHOLDS.fatigued}%+ from peak`} />
        <Stat label="Approaching" value={String(approaching.length)} sub={`down ${FATIGUE_THRESHOLDS.approaching}–${FATIGUE_THRESHOLDS.fatigued}%`} />
        <Stat label="Past 75 days live" value={String(old.length)} sub="nearing the 90-day mark" />
        <Stat label="Healthy live ads" value={String(ws.ads.filter((a) => a.status === "live").length - report.length)} />
      </div>

      {worst.length > 0 && (
        <Card title="Steepest declines" description="7-day rolling CTR for the five most fatigued live ads">
          <LineChart label="Rolling CTR for the most fatigued ads" unit="pct" series={worst.map((w, i) => ({ name: w.ad.name, color: SERIES_COLORS[i % SERIES_COLORS.length], points: w.series }))} />
        </Card>
      )}

      <Card title="Ads to refresh" description="Live ads with at least 14 days of data whose CTR has dropped from its peak" padded={false}>
        {report.length === 0 ? <div className="p-5"><EmptyState title="No fatigue detected" body="Live ads are holding their click-through rate." /></div> : (
          <ul className="divide-y divide-brand-neutral-150">
            {report.map((f) => (
              <li key={f.ad.id}>
                <AdRow ad={f.ad} right={
                  <span className="flex items-center gap-4">
                    <span className="hidden text-right text-xs text-brand-neutral-650 sm:block">{f.daysLive} days live<br />{fmtPct(f.peakCtr)} → {fmtPct(f.currentCtr)}</span>
                    <Sparkline values={f.series.map((s) => s.y)} color={f.level === "fatigued" ? "#AE453F" : "#D07A2F"} label={`CTR trend for ${f.ad.name}`} />
                    <Chip variant={f.level === "fatigued" ? "failed" : "pending"} chevron={false} className="!px-2.5 !py-1 !text-xs">−{f.declinePct.toFixed(0)}%</Chip>
                  </span>
                } />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {old.length > 0 && (
        <Card title="Nearing 90 days" description="Scorecards treat anything over 90 days in market as due for a look" padded={false}>
          <ul className="divide-y divide-brand-neutral-150">{old.slice(0, 8).map((a) => <li key={a.id}><AdRow ad={a} right={<span className="text-sm tabular-nums text-brand-neutral-750">{daysLive(a, ws.asOf)} days</span>} /></li>)}</ul>
        </Card>
      )}

      <Card title="Refresh a fatigued concept">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-brand-neutral-650">Start a new batch from the same Figma template with fresh copy to replace the creatives above.</p>
          <Button asChild><Link href="/batches/new"><Sparkles /> New batch</Link></Button>
        </div>
      </Card>
    </div>
  );
}

export default function Fatigue() {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading fatigue report…</p>}><Content /></Suspense>;
}
