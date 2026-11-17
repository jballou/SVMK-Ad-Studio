import { UploadPerformance } from "@/components/scorecards/UploadPerformance";

/** The one place that explains why a page is empty: what's missing, and what to do about it. */
export function noDataReason(ws: { ads: unknown[]; daily: unknown[]; dummy: boolean }): { title: string; body: string } | null {
  if (ws.daily.length > 0) return null;
  const off = ws.dummy ? "" : "Dummy data is off, so only real data is shown. ";
  if (ws.ads.length === 0) return { title: "No ads yet", body: `${off}Ad Studio has no ads. Upload a LinkedIn performance export to add your ads and their numbers, or build a batch from a template.` };
  return { title: "No performance numbers yet", body: `${off}There ${ws.ads.length === 1 ? "is 1 ad" : `are ${ws.ads.length.toLocaleString("en-US")} ads`} but no daily performance data for ${ws.ads.length === 1 ? "it" : "them"}. Upload a performance export to fill this in.` };
}

export function NoData({ reason }: { reason: { title: string; body: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-loose border border-dashed border-brand-neutral-250 p-8 text-center" role="status">
      <h2 className="text-lg font-semibold">{reason.title}</h2>
      <p className="max-w-xl text-sm text-muted">{reason.body}</p>
      <UploadPerformance variant="primary" />
    </div>
  );
}
