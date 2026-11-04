import { connection } from "next/server";
import { Suspense } from "react";
import { BenchmarkManager } from "@/components/settings/BenchmarkManager";
import { getDb } from "@/db";
import { listBenchmarkRows } from "@/lib/db/repo";

export const metadata = { title: "Benchmarks · Ad Studio" };

async function Content() {
  await connection();
  return <BenchmarkManager rows={await listBenchmarkRows(await getDb())} />;
}

export default function Page() {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading…</p>}><Content /></Suspense>;
}
