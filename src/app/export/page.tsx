import { connection } from "next/server";
import { Suspense } from "react";
import { ExportCenter } from "@/components/export/ExportCenter";
import { PageHeader } from "@/components/ui/primitives";
import { getDb } from "@/db";
import { listAds } from "@/lib/db/repo";

export const metadata = { title: "Export · Ad Studio" };

async function Content({ searchParams }: { searchParams: Promise<{ ads?: string }> }) {
  await connection();
  const [{ ads: sel }, ads] = await Promise.all([searchParams, getDb().then(listAds)]);
  return <ExportCenter ads={ads} initial={sel ? sel.split(",").filter(Boolean) : []} />;
}

export default function ExportPage({ searchParams }: { searchParams: Promise<{ ads?: string }> }) {
  return (
    <>
      <PageHeader title="Export" description="Download ads individually or as a batch, organized the way each platform team expects, with a spreadsheet manifest." />
      <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading…</p>}><Content searchParams={searchParams} /></Suspense>
    </>
  );
}
