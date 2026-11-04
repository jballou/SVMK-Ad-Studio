import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Beaker } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { Chip } from "@/components/ui/chip";
import { Card, EmptyState, Stat } from "@/components/ui/primitives";
import { compareCtr } from "@/lib/analytics/ab";
import { sumPoints } from "@/lib/analytics/aggregate";
import { listExperiments } from "@/lib/db/repo";
import { loadWorkspace } from "@/lib/db/workspace";
import { fmtCompact, fmtDate, fmtPct } from "@/lib/format";
import type { AdRecord } from "@/lib/ads/types";

export const metadata = { title: "A/B tests · Ad Studio" };

function Side({ ad, ctr, impressions, win, label }: { ad: AdRecord; ctr: number; impressions: number; win: boolean; label: string }) {
  return (
    <Link href={`/gallery/${ad.name}`} className={`block rounded-lg border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500 ${win ? "border-brand-green-400 bg-brand-green-100/40" : "border-brand-neutral-200"}`}>
      <div className="flex items-start gap-3">
        <span className="w-20 shrink-0 overflow-hidden rounded border border-brand-neutral-200"><AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={false} composition={ad.composition} placementKey={ad.placement} /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-neutral-650">Variant {label}{win && <span className="ml-1.5 text-brand-green-600">Winner</span>}</p>
          <p className="truncate text-sm font-medium" title={ad.name}>{ad.conceptKey}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{fmtPct(ctr)}</p>
          <p className="text-xs text-brand-neutral-650">{fmtCompact(impressions)} impressions</p>
        </div>
      </div>
    </Link>
  );
}

function winnerLift(res: { ctrA: number; ctrB: number; winner: string }) {
  const [w, l] = res.winner === "A" ? [res.ctrA, res.ctrB] : [res.ctrB, res.ctrA];
  return l === 0 ? 0 : ((w - l) / l) * 100;
}

async function Content({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
  const [{ status }, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const all = await listExperiments(ws.db);
  const rows = all.flatMap((e) => {
    const a = ws.adsByName.get(e.adA);
    const b = ws.adsByName.get(e.adB);
    if (!a || !b) return [];
    // Compare only the days both ads were running.
    const pa = ws.pointsByAd.get(a.name) ?? [];
    const pb = ws.pointsByAd.get(b.name) ?? [];
    const from = e.startedAt;
    const to = [pa[pa.length - 1]?.day, pb[pb.length - 1]?.day].filter(Boolean).sort()[0] ?? from;
    const ta = sumPoints(pa.filter((p) => p.day >= from && p.day <= to));
    const tb = sumPoints(pb.filter((p) => p.day >= from && p.day <= to));
    return [{ e, a, b, ta, tb, res: compareCtr(ta, tb) }];
  });
  const shown = rows.filter((r) => !status || r.e.status === status);
  const decided = rows.filter((r) => r.res.winner !== "none");
  const byVar = new Map<string, number>();
  for (const r of decided) byVar.set(r.e.variable, (byVar.get(r.e.variable) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tests" value={String(rows.length)} sub={`${rows.filter((r) => r.e.status === "running").length} running`} />
        <Stat label="Clear winners" value={String(decided.length)} sub={`${Math.round((decided.length / Math.max(1, rows.length)) * 100)}% of tests`} />
        <Stat label="Avg. winner lift" value={decided.length ? `+${(decided.reduce((s, r) => s + Math.abs(r.res.lift), 0) / decided.length).toFixed(0)}%` : "—"} sub="CTR" />
        <Stat label="Most decisive variable" value={[...byVar].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "—"} />
      </div>
      <nav aria-label="Filter tests" className="flex gap-1.5">
        {[["", "All"], ["running", "Running"], ["concluded", "Concluded"]].map(([v, l]) => (
          <Link key={v} href={v ? `/performance/tests?status=${v}` : "/performance/tests"} aria-current={(status ?? "") === v ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-medium ${(status ?? "") === v ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250 bg-white hover:bg-brand-neutral-100"}`}>{l}</Link>
        ))}
      </nav>
      {shown.length === 0 && <EmptyState title="No tests here" body="Tests pair two ads on the same platform and size that differ in one variable." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {shown.map(({ e, a, b, ta, tb, res }) => (
          <Card key={e.id} title={e.name} description={`Tests ${e.variable} · started ${fmtDate(e.startedAt)}`} actions={<Chip variant={e.status === "running" ? "pending" : "completed"} chevron={false} className="!px-2.5 !py-1 !text-xs">{e.status === "running" ? "Running" : "Concluded"}</Chip>}>
            <p className="mb-3 flex items-start gap-2 text-sm text-brand-neutral-750"><Beaker className="mt-0.5 size-4 shrink-0 text-brand-periwinkle-600" aria-hidden />Hypothesis: {e.hypothesis}</p>
            <div className="grid grid-cols-2 gap-3">
              <Side ad={a} ctr={res.ctrA} impressions={ta.impressions} win={res.winner === "A"} label="A" />
              <Side ad={b} ctr={res.ctrB} impressions={tb.impressions} win={res.winner === "B"} label="B" />
            </div>
            <p className="mt-3 text-sm">
              {res.underpowered ? <span className="text-brand-neutral-650">Not enough volume to call yet.</span> : res.significant ? <span><strong>Variant {res.winner}</strong> wins with {winnerLift(res).toFixed(0)}% higher CTR <span className="text-brand-neutral-650">(p = {res.pValue < 0.001 ? "<0.001" : res.pValue.toFixed(3)})</span>.</span> : <span className="text-brand-neutral-650">No significant difference (p = {res.pValue.toFixed(2)}, {res.lift >= 0 ? "+" : ""}{res.lift.toFixed(0)}% CTR for B).</span>}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Tests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading tests…</p>}><Content searchParams={searchParams} /></Suspense>;
}
