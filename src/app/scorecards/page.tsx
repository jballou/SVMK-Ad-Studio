import { connection } from "next/server";
import { Suspense } from "react";
import { Scorecards } from "@/components/scorecards/Scorecards";
import { getDb } from "@/db";
import { getBenchmarks, getChecks, getTotals, listAds, periodFor } from "@/lib/db/repo";

export const metadata = { title: "Scorecards · Ad Studio" };

// "today" drives days-live and the learning gate, so this renders per request.
async function Content() {
  await connection();
  const db = await getDb();
  const today = new Date().toLocaleDateString("en-CA");
  const [ads, totals, benchmarks, checks] = await Promise.all([listAds(db), getTotals(db), getBenchmarks(db), getChecks(db, periodFor(today))]);
  return <Scorecards ads={ads} benchmarks={benchmarks} totals={totals} checks={checks} today={today} />;
}

export default function ScorecardsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Scorecards</h1>
      <p className="text-sm text-neutral-600">Sample ads and benchmarks in a local development database. Uploaded CSV data and manual checks are saved.</p>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
