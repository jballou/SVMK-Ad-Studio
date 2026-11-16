"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { importMetrics as importAction, linkPlatformAds } from "@/app/actions";
import { Card } from "@/components/ui/primitives";
import type { AdRecord } from "@/lib/ads/types";
import type { ImportSummary } from "@/lib/db/repo";
import { decodeExport, importMetrics, type MetricRow } from "@/lib/metrics/csv";
import { fmtCompact, fmtMoney } from "@/lib/format";
import { platformKeys } from "@/lib/specs/platforms";
import { PLATFORM_LABEL } from "@/lib/ui/colors";

const MAX_BYTES = 3_800_000;
const sel = "h-10 rounded-tight border border-control bg-card px-4 text-sm text-ink";

/**
 * Performance upload. Pick the platform the export came from; its ad names or IDs are matched to Ad Studio ads
 * through saved links, and anything unmatched can be linked right here, then the file is re-imported.
 */
export function PerformanceImport({ ads }: { ads: Pick<AdRecord, "name" | "platform" | "status">[] }) {
  const router = useRouter();
  const [platform, setPlatform] = useState("linkedin");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [unmatched, setUnmatched] = useState<ImportSummary["unmatched"]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const options = ads.filter((a) => a.platform === platform).map((a) => a.name).sort();

  const run = async (data: MetricRow[], note: string[] = []) => {
    const saved = await importAction(data, platform);
    const bits = [...note, `Saved ${saved.imported.toLocaleString("en-US")} daily rows`];
    if (saved.unmatched.length) bits.push(`${saved.unmatched.length} ${PLATFORM_LABEL[platform]} ads aren't linked to an Ad Studio ad yet`);
    setMsg(bits.join(". ") + ".");
    setUnmatched(saved.unmatched);
    setPicks({});
    router.refresh();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setUnmatched([]);
    try {
      const res = importMetrics(decodeExport(await file.arrayBuffer()));
      if (res.rows.length === 0) return setMsg(`Import failed: ${res.errors[0]?.message ?? "no rows found"}`);
      // Ads that were paused or not yet running show up as all-zero days; they carry nothing and bloat the upload.
      const data = res.rows.filter((r) => r.spend || r.impressions || r.clicks || r.conversions);
      if (data.length === 0) return setMsg("Import failed: every row in the file is zero.");
      if (JSON.stringify(data).length > MAX_BYTES) return setMsg(`This file has ${data.length.toLocaleString("en-US")} active ad-days, which is too big for one upload. Export a shorter date range (about 60 days at this size) and upload in parts.`);
      setRows(data);
      const note = res.errors.length ? [`${res.errors.length} rows skipped (first: line ${res.errors[0].line}, ${res.errors[0].message})`] : [];
      await run(data, note);
    } catch {
      setMsg("Import failed on the server. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    const links = Object.entries(picks).filter(([, name]) => name).map(([key, adName]) => ({ key, adName }));
    if (!links.length) return;
    setBusy(true);
    try {
      const { saved } = await linkPlatformAds(platform, links);
      await run(rows, [`Linked ${saved} ads`]);
    } catch {
      setMsg("Couldn't save the links. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const chosen = Object.values(picks).filter(Boolean).length;

  return (
    <Card title="Import performance" description={`Upload a daily, by-ad export. For LinkedIn: Campaign Manager → Reporting → Ad performance → Export (by day, with Creative name and ID). Saved links make later uploads match automatically.`} actions={<Upload className="size-4 text-muted" aria-hidden />}>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs font-medium text-muted">Platform
          <select value={platform} onChange={(e) => { setPlatform(e.target.value); setUnmatched([]); setMsg(""); }} className={`${sel} mt-0 block`}>
            {platformKeys().map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
          </select>
        </label>
        <input type="file" accept=".csv,.tsv,.txt,text/csv" disabled={busy} className="text-sm" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} aria-label="Upload performance export" />
      </div>
      {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}

      {unmatched.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Link each {PLATFORM_LABEL[platform]} ad to its Ad Studio ad</p>
          {options.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Ad Studio has no {PLATFORM_LABEL[platform]} ads to link to yet. Build and launch ads in a batch first, then upload again.</p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-brand-neutral-150 rounded-loose border border-brand-neutral-200">
                {unmatched.slice(0, 50).map((u) => (
                  <li key={u.key} className="flex flex-wrap items-center gap-4 p-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted">{u.externalId ? `ID ${u.externalId} · ` : ""}{u.rows} days · {fmtCompact(u.impressions)} impressions · {fmtMoney(u.spend)}</span>
                    </span>
                    <select aria-label={`Ad Studio ad for ${u.name}`} value={picks[u.key] ?? ""} onChange={(e) => setPicks((p) => ({ ...p, [u.key]: e.target.value }))} className={`${sel} w-64`}>
                      <option value="">Not linked</option>
                      {options.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
              {unmatched.length > 50 && <p className="mt-2 text-xs text-muted">Showing the 50 biggest by impressions; link these, then upload again for the rest.</p>}
              <button type="button" onClick={link} disabled={busy || chosen === 0} className="btn btn-md btn-primary mt-4">Save {chosen || ""} links and re-import</button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
