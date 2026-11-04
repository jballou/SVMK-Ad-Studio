import { connection } from "next/server";
import { Suspense } from "react";
import { ScoreSettings } from "@/components/settings/ScoreSettings";
import { getDb } from "@/db";
import { getGate } from "@/lib/db/repo";

export const metadata = { title: "Scorecard rules · Ad Studio" };

async function Content() {
  await connection();
  return <ScoreSettings gate={await getGate(await getDb())} />;
}

export default function Page() {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading…</p>}><Content /></Suspense>;
}
