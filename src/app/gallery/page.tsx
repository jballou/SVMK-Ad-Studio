import { connection } from "next/server";
import { Gallery, type AdStat } from "@/components/gallery/Gallery";
import { PageHeader } from "@/components/ui/primitives";
import { rates, totalsByAd } from "@/lib/analytics/aggregate";
import { loadWorkspace } from "@/lib/db/workspace";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Ad gallery · Ad Studio" };

async function Content({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; platform?: string }> }) {
  await connection();
  const [params, ws] = await Promise.all([searchParams, loadWorkspace()]);
  const stats: Record<string, AdStat> = {};
  for (const [name, t] of totalsByAd(ws.daily)) stats[name] = { impressions: t.impressions, ctr: rates(t).ctr };
  return <Gallery initial={ws.ads} stats={stats} initialFilters={params} />;
}

export default function GalleryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; platform?: string }> }) {
  return (
    <>
      <PageHeader title="Ad gallery" description="Every ad across platforms. Browse as thumbnails, a gallery or a list; change status, filter by tags, and select ads to export." />
      <Loadable>
        <Content searchParams={searchParams} />
      </Loadable>
    </>
  );
}
