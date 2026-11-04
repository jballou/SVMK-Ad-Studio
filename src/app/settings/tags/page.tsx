import { connection } from "next/server";
import { Suspense } from "react";
import { TaxonomyEditor } from "@/components/settings/TaxonomyEditor";
import { getDb } from "@/db";
import { getTaxonomy } from "@/lib/db/repo";

export const metadata = { title: "Tags · Ad Studio" };

async function Content() {
  await connection();
  return <TaxonomyEditor taxonomy={await getTaxonomy(await getDb())} />;
}

export default function Page() {
  return <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading…</p>}><Content /></Suspense>;
}
