"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Package, X } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { PlatformBadge, StatusChip } from "@/components/ads/badges";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { Card, DataTable } from "@/components/ui/primitives";
import type { AdRecord } from "@/lib/ads/types";
import { estimateBytes, exportPath, manifestRows, MANIFEST_HEADER, toCsv, type Format, type Structure } from "@/lib/export/manifest";
import { fmtDate, fmtInt } from "@/lib/format";

interface HistoryItem { id: string; at: string; by: string; files: number; bytes: number; format: string; scale: number; scope: string; status: "ready" | "building" }

const SEED_HISTORY: HistoryItem[] = [
  { id: "h1", at: "2026-10-30", by: "Priya Shah", files: 18, bytes: 38_400_000, format: "PNG", scale: 1, scope: "Phase 2: LinkedIn Consideration", status: "ready" },
  { id: "h2", at: "2026-10-22", by: "Alex Rivera", files: 42, bytes: 71_200_000, format: "PNG", scale: 2, scope: "Meta Awareness, all placements", status: "ready" },
  { id: "h3", at: "2026-10-09", by: "Marcus Lee", files: 9, bytes: 6_300_000, format: "JPG", scale: 1, scope: "Display standard sizes", status: "ready" },
  { id: "h4", at: "2026-09-28", by: "Dana Whitfield", files: 24, bytes: 29_900_000, format: "PNG", scale: 1, scope: "Newsletter + LinkedIn", status: "ready" },
];

const mb = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const sel = "h-9 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm";

function download(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportCenter({ ads, initial }: { ads: AdRecord[]; initial: string[] }) {
  const valid = useMemo(() => new Set(ads.map((a) => a.name)), [ads]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initial.filter((n) => valid.has(n))));
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState(1);
  const [structure, setStructure] = useState<Structure>("platform");
  const [manifest, setManifest] = useState(true);
  const [history, setHistory] = useState(SEED_HISTORY);
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const filtered = useMemo(() => ads.filter((a) => a.status !== "draft" || picked.has(a.name) || status === "draft").filter((a) => (!platform || a.platform === platform) && (!status || a.status === status) && (!q || a.name.toLowerCase().includes(q.toLowerCase()))), [ads, platform, status, q, picked]);
  const chosen = useMemo(() => ads.filter((a) => picked.has(a.name)), [ads, picked]);
  const bytes = estimateBytes(chosen, format, scale);
  const allFilteredPicked = filtered.length > 0 && filtered.every((a) => picked.has(a.name));
  const toggle = (n: string) => setPicked((s) => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; });

  const downloadManifest = () => download(`ad-studio-manifest-${new Date().toLocaleDateString("en-CA")}.csv`, toCsv(MANIFEST_HEADER, manifestRows(chosen, structure, format)));

  const build = () => {
    if (chosen.length === 0 || progress !== null) return;
    setProgress(0);
    const files = chosen.length + (manifest ? 1 : 0);
    const scope = chosen.length === 1 ? chosen[0].name : `${chosen.length} ads · ${[...new Set(chosen.map((c) => c.platform))].join(", ")}`;
    timer.current = setInterval(() => {
      setProgress((p) => {
        if ((p ?? 0) >= 100) {
          if (timer.current) clearInterval(timer.current);
          setHistory((h) => [{ id: `h${Date.now()}`, at: new Date().toLocaleDateString("en-CA"), by: "Jarrod B.", files, bytes, format: format.toUpperCase(), scale, scope, status: "ready" }, ...h]);
          return null;
        }
        return Math.min(100, (p ?? 0) + 12 + Math.random() * 10);
      });
    }, 350);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-neutral-200 bg-white p-3">
          <label className="text-xs font-medium text-brand-neutral-650">Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad or concept" className={`${sel} mt-1 block w-44`} /></label>
          <label className="text-xs font-medium text-brand-neutral-650">Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${sel} mt-1 block`}><option value="">All</option>{["linkedin", "meta", "display", "newsletter"].map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="text-xs font-medium text-brand-neutral-650">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className={`${sel} mt-1 block capitalize`}><option value="">Launched</option>{["live", "paused", "retired", "draft"].map((p) => <option key={p}>{p}</option>)}</select></label>
          <Button variant="outline" size="md" onClick={() => setPicked((s) => { const x = new Set(s); for (const a of filtered) { if (allFilteredPicked) x.delete(a.name); else x.add(a.name); } return x; })}>{allFilteredPicked ? "Deselect" : "Select"} all {filtered.length}</Button>
        </div>

        <div className="max-h-[640px] overflow-y-auto rounded-xl border border-brand-neutral-200 bg-white">
          <ul className="divide-y divide-brand-neutral-150">
            {filtered.slice(0, 120).map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-brand-neutral-50">
                  <input type="checkbox" checked={picked.has(a.name)} onChange={() => toggle(a.name)} className="size-4 accent-brand-green-600" />
                  <span className="w-12 shrink-0 overflow-hidden rounded border border-brand-neutral-200"><AdArt art={a.art} copy={a.copy} width={a.width} height={a.height} showCta={false} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.name}</span><span className="flex items-center gap-2"><PlatformBadge platform={a.platform} /><span className="text-xs text-brand-neutral-650">{a.width}×{a.height}</span></span></span>
                  <StatusChip status={a.status} />
                </label>
              </li>
            ))}
            {filtered.length === 0 && <li className="p-6 text-center text-sm text-brand-neutral-650">No ads match these filters.</li>}
          </ul>
          {filtered.length > 120 && <p className="border-t border-brand-neutral-150 p-3 text-center text-xs text-brand-neutral-650">Showing the first 120 of {filtered.length}. Narrow the filters to see the rest.</p>}
        </div>

        <Card title="Export history" padded={false}>
          <div className="px-5 py-3">
            <DataTable caption="Export history" columns={[{ label: "Date" }, { label: "Contents" }, { label: "Format" }, { label: "Files", align: "right" }, { label: "Size", align: "right" }, { label: "By" }, { label: "Status" }]}>
              {history.map((h) => (
                <tr key={h.id}><td className="py-2.5 pr-3 text-brand-neutral-750">{fmtDate(h.at)}</td><td className="px-3 font-medium">{h.scope}</td><td className="px-3 text-brand-neutral-750">{h.format} {h.scale}×</td><td className="px-3 text-right tabular-nums">{h.files}</td><td className="px-3 text-right tabular-nums">{mb(h.bytes)}</td><td className="px-3 text-brand-neutral-750">{h.by}</td><td className="py-2.5 pl-3"><Chip variant="completed" chevron={false} className="!px-2.5 !py-1 !text-xs">Ready</Chip></td></tr>
              ))}
            </DataTable>
          </div>
        </Card>
      </div>

      <aside aria-label="Export options" className="h-fit space-y-4 rounded-xl border border-brand-neutral-200 bg-white p-4 xl:sticky xl:top-20">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Export options</h2>{picked.size > 0 && <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}><X /> Clear</Button>}</div>
        <p className="text-sm"><span className="text-2xl font-semibold tabular-nums">{picked.size}</span> <span className="text-brand-neutral-650">ad{picked.size === 1 ? "" : "s"} selected</span></p>
        <fieldset className="space-y-1.5"><legend className="text-xs font-medium text-brand-neutral-650">Format</legend>
          <div className="flex gap-2">{(["png", "jpg"] as Format[]).map((f) => <label key={f} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium uppercase ${format === f ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250"}`}><input type="radio" name="format" className="sr-only" checked={format === f} onChange={() => setFormat(f)} />{f}</label>)}</div>
        </fieldset>
        <fieldset className="space-y-1.5"><legend className="text-xs font-medium text-brand-neutral-650">Resolution</legend>
          <div className="flex gap-2">{[1, 2].map((s) => <label key={s} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${scale === s ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250"}`}><input type="radio" name="scale" className="sr-only" checked={scale === s} onChange={() => setScale(s)} />{s}×</label>)}</div>
        </fieldset>
        <label className="block text-xs font-medium text-brand-neutral-650">Folder structure
          <select value={structure} onChange={(e) => setStructure(e.target.value as Structure)} className={`${sel} mt-1 w-full`}><option value="platform">By platform and size</option><option value="concept">By concept</option><option value="flat">Flat</option></select>
        </label>
        {chosen[0] && <p className="break-all rounded bg-brand-neutral-100 px-2 py-1.5 font-mono text-[11px] text-brand-neutral-750">{exportPath(chosen[0], structure, format)}</p>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={manifest} onChange={(e) => setManifest(e.target.checked)} className="accent-brand-green-600" />Include spreadsheet manifest</label>
        <p className="text-xs text-brand-neutral-650">Estimated size: {picked.size ? mb(bytes) : "—"}</p>
        <div className="space-y-2">
          <Button className="w-full" disabled={picked.size === 0 || progress !== null} onClick={build}><Package /> {progress === null ? `Build package (${picked.size + (manifest && picked.size ? 1 : 0)} files)` : `Building… ${Math.round(progress)}%`}</Button>
          <Button variant="outline" className="w-full" disabled={picked.size === 0} onClick={downloadManifest}><FileSpreadsheet /> Download manifest (CSV)</Button>
        </div>
        {progress !== null && <div role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Package progress" className="h-1.5 overflow-hidden rounded-full bg-brand-neutral-150"><div className="h-full bg-brand-green-600 transition-all" style={{ width: `${progress}%` }} /></div>}
        <p className="flex items-start gap-1.5 text-[11px] text-brand-neutral-550"><Download className="mt-0.5 size-3 shrink-0" aria-hidden />The manifest download is real. Images are not rendered yet: packages are simulated until the Figma export is connected. {fmtInt(ads.length)} ads available.</p>
      </aside>
    </div>
  );
}
