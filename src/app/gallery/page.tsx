import { connection } from "next/server";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery/Gallery";
import { getDb } from "@/db";
import { listAds } from "@/lib/db/repo";

export const metadata = { title: "Gallery · Ad Studio" };

async function Content() {
  await connection();
  return <Gallery initial={await listAds(await getDb())} />;
}

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Ad gallery</h1>
      <p className="text-sm text-neutral-600">Sample data in a local development database.</p>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
