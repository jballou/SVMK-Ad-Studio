import { connection } from "next/server";
import { Suspense } from "react";
import { Scorecards } from "@/components/scorecards/Scorecards";
import { SEED_ADS } from "@/lib/ads/seed";
import { SAMPLE_BENCHMARKS, SAMPLE_TOTALS } from "@/lib/scorecard/sample";

export const metadata = { title: "Scorecards · Ad Studio" };

// "today" drives days-live and the learning gate, so this renders per request.
async function Content() {
  await connection();
  const today = new Date().toLocaleDateString("en-CA");
  return <Scorecards ads={SEED_ADS} benchmarks={SAMPLE_BENCHMARKS} sampleTotals={SAMPLE_TOTALS} today={today} />;
}

export default function ScorecardsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Scorecards</h1>
      <p className="text-sm text-neutral-600">Sample ads, sample benchmarks and sample numbers. Manual checks are not saved yet.</p>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
