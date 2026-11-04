import { connection } from "next/server";
import { Suspense } from "react";
import { Scorecards } from "@/components/scorecards/Scorecards";
import { PageHeader } from "@/components/ui/primitives";
import { totalsByAd } from "@/lib/analytics/aggregate";
import { getChecks, periodFor } from "@/lib/db/repo";
import { loadWorkspace } from "@/lib/db/workspace";

export const metadata = { title: "Scorecards · Ad Studio" };

// "today" drives days-live and the learning gate, so this renders per request.
async function Content() {
  await connection();
  const ws = await loadWorkspace();
  const period = periodFor(ws.today);
  const checks = await getChecks(ws.db, period);
  return <Scorecards ads={ws.ads} benchmarks={ws.benchmarks} totals={Object.fromEntries(totalsByAd(ws.daily))} checks={checks} today={ws.today} gate={ws.gate} period={period} />;
}

export default function ScorecardsPage() {
  return (
    <>
      <PageHeader title="Scorecards" description="Each ad scored out of 100% against the same eight criteria. Ads still in the learning phase show “Too early” and are not scored." />
      <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading scorecards…</p>}><Content /></Suspense>
    </>
  );
}
