import { connection } from "next/server";
import { Suspense } from "react";
import { BatchWizard } from "@/components/batches/BatchWizard";
import { PageHeader } from "@/components/ui/primitives";
import { getDb } from "@/db";
import { listAds } from "@/lib/db/repo";

export const metadata = { title: "New batch · Ad Studio" };

async function Content() {
  await connection();
  const names = (await listAds(await getDb())).map((a) => a.name);
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const defaultMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  return <BatchWizard existing={names} defaultMonth={defaultMonth} />;
}

export default function NewBatch() {
  return (
    <>
      <PageHeader title="New batch" description="Pick Figma concepts, link a copy deck, choose platforms, preview, and generate every size you need." />
      <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading…</p>}><Content /></Suspense>
    </>
  );
}
