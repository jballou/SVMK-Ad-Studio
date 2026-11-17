"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, TriangleAlert, Upload, X } from "lucide-react";
import { importPerformance } from "@/app/actions";
import type { Conflict, ImportDecisions, ImportSummary2 } from "@/lib/db/performance-import";
import { detectPlatform } from "@/lib/import/linkedin";
import { decodeExport, importMetrics, type CsvImport } from "@/lib/metrics/csv";
import { fmtCompact, fmtMoney } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/ui/colors";

const MAX_BYTES = 3_800_000;
const sel = "h-10 w-full rounded-tight border border-control bg-card px-4 text-sm text-ink";

type Stage =
  | { name: "idle" }
  | { name: "working"; text: string }
  | { name: "asking"; conflicts: Conflict[] }
  | { name: "done"; summary: ImportSummary2 }
  | { name: "error"; text: string };

/**
 * One button, one file. Drop a platform export and the ads in it are matched or created automatically;
 * the only questions are an ad that could be two different ones, or stored numbers that disagree with the file.
 */
export function UploadPerformance({ label = "Upload performance", variant = "secondary" }: { label?: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [parsed, setParsed] = useState<{ platform: string; csv: CsvImport } | null>(null);
  const [data, setData] = useState<"replace" | "keep">("replace");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [over, setOver] = useState(false);

  const open = () => { setStage({ name: "idle" }); setParsed(null); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();

  const send = async (p: { platform: string; csv: CsvImport }, decisions?: ImportDecisions) => {
    setStage({ name: "working", text: `Importing ${p.csv.rows.length.toLocaleString("en-US")} daily rows for ${p.csv.ads.length.toLocaleString("en-US")} ads…` });
    try {
      const res = await importPerformance({ platform: p.platform, rows: p.csv.rows, ads: p.csv.ads, decisions });
      if (res.status === "done") { setStage({ name: "done", summary: res.summary }); router.refresh(); return; }
      setData("replace");
      setPick(Object.fromEntries(res.conflicts.flatMap((c) => (c.kind === "ambiguous" ? [[c.key, c.options[0]]] : []))));
      setStage({ name: "asking", conflicts: res.conflicts });
    } catch {
      setStage({ name: "error", text: "The import failed on the server. Nothing was saved." });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStage({ name: "working", text: "Reading the file…" });
    try {
      const csv = importMetrics(decodeExport(await file.arrayBuffer()));
      if (csv.rows.length === 0) return setStage({ name: "error", text: `That file couldn't be read: ${csv.errors[0]?.message ?? "no rows found"}.` });
      const platform = detectPlatform(csv.headers);
      if (!platform) return setStage({ name: "error", text: "I can't tell which platform this export is from. LinkedIn Campaign Manager exports (Ad Performance, broken out by day) are supported so far." });
      // Days with nothing delivered carry no information and make the upload several times bigger.
      const rows = csv.rows.filter((r) => r.spend || r.impressions || r.clicks || r.conversions);
      if (rows.length === 0) return setStage({ name: "error", text: "Every row in this file is zero." });
      const live = new Set(rows.map((r) => r.externalId ?? r.adName));
      const trimmed = { ...csv, rows, ads: csv.ads.filter((a) => live.has(a.key)) };
      if (JSON.stringify(trimmed).length > MAX_BYTES) return setStage({ name: "error", text: `This file has ${rows.length.toLocaleString("en-US")} active ad-days, which is too big for one upload. Export a shorter date range (about 60 days at this size) and upload in parts.` });
      const p = { platform, csv: trimmed };
      setParsed(p);
      await send(p);
    } catch {
      setStage({ name: "error", text: "That file couldn't be read." });
    }
  };

  const answer = () => {
    if (!parsed || stage.name !== "asking") return;
    void send(parsed, { data: stage.conflicts.some((c) => c.kind === "data") ? data : undefined, pick });
  };

  return (
    <>
      <button type="button" onClick={open} className={`btn btn-md ${variant === "primary" ? "btn-primary" : "btn-secondary"}`}><Upload aria-hidden /> {label}</button>
      <dialog ref={dialog} aria-labelledby="upload-title" className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-loose border border-brand-neutral-200 bg-card p-0 text-ink backdrop:bg-black/40">
        <div className="flex items-center justify-between border-b border-brand-neutral-200 p-4">
          <h2 id="upload-title" className="text-lg font-semibold">Upload performance</h2>
          <button type="button" onClick={close} aria-label="Close" className="btn btn-sm btn-ghost"><X aria-hidden /></button>
        </div>

        <div className="p-6">
          {stage.name === "idle" && (
            <>
              <label
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); void onFile(e.dataTransfer.files[0]); }}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-loose border-2 border-dashed p-8 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-periwinkle-500 ${over ? "border-brand-green-600 bg-brand-neutral-100" : "border-brand-neutral-250"}`}
              >
                <FileUp className="size-8 text-muted" aria-hidden />
                <span className="text-sm font-medium">Drop your export here, or click to choose a file</span>
                <span className="text-xs text-muted">LinkedIn Campaign Manager: Advertise → Export → Ad Performance, broken out by day. CSV or TSV, any length.</span>
                <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" aria-label="Choose a performance export" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <p className="mt-4 text-xs text-muted">Ads in the file are matched to Ad Studio ads by their saved link, their name, or their concept, month and size. Ads Ad Studio doesn&apos;t have yet are added, with format, size, stage and geo read from their names. You&apos;ll only be asked if something is unclear.</p>
            </>
          )}

          {stage.name === "working" && (
            <p className="flex items-center gap-2 text-sm" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden /> {stage.text}</p>
          )}

          {stage.name === "error" && (
            <div role="alert">
              <p className="flex items-start gap-2 text-sm text-brand-red-500"><TriangleAlert className="mt-0 size-4 shrink-0" aria-hidden /> {stage.text}</p>
              <button type="button" onClick={() => setStage({ name: "idle" })} className="btn btn-md btn-secondary mt-4">Try another file</button>
            </div>
          )}

          {stage.name === "asking" && (
            <div className="space-y-6">
              <p className="text-sm text-muted">Everything else in the file was clear. Nothing is saved until you answer.</p>
              {stage.conflicts.map((c) =>
                c.kind === "data" ? (
                  <fieldset key="data" className="space-y-2">
                    <legend className="text-sm font-medium">Stored numbers differ from this file for {c.days.toLocaleString("en-US")} days across {c.ads} ads</legend>
                    <ul className="rounded-tight bg-brand-neutral-100 p-4 text-xs text-muted">
                      {c.examples.map((e) => <li key={`${e.ad}|${e.day}`} className="truncate"><span className="font-medium text-ink">{e.ad}</span> · {e.day}: stored {e.stored}, file {e.incoming}</li>)}
                    </ul>
                    {([["replace", "Use the numbers in this file (platforms restate recent days, so the newer export is usually right)"], ["keep", "Keep what's stored for those days"]] as const).map(([v, t]) => (
                      <label key={v} className="flex items-start gap-2 text-sm"><input type="radio" name="data" checked={data === v} onChange={() => setData(v)} className="mt-2" /> {t}</label>
                    ))}
                  </fieldset>
                ) : (
                  <label key={c.key} className="block text-sm">
                    <span className="font-medium">Which ad is “{c.name}”?</span>
                    <select value={pick[c.key] ?? ""} onChange={(e) => setPick((p) => ({ ...p, [c.key]: e.target.value }))} className={`${sel} mt-2`}>
                      {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value="__new__">None of these: add it as a new ad</option>
                    </select>
                  </label>
                ),
              )}
              <div className="flex gap-2">
                <button type="button" onClick={answer} className="btn btn-md btn-primary">Continue</button>
                <button type="button" onClick={() => setStage({ name: "idle" })} className="btn btn-md btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {stage.name === "done" && <Done summary={stage.summary} onClose={close} />}
        </div>
      </dialog>
    </>
  );
}

function Done({ summary: s, onClose }: { summary: ImportSummary2; onClose: () => void }) {
  return (
    <div className="space-y-4" role="status">
      <p className="text-sm font-medium">Imported {s.days.toLocaleString("en-US")} days of {(PLATFORM_LABEL as Record<string, string>)[s.platform] ?? s.platform} performance: {fmtMoney(s.spend)} spend, {fmtCompact(s.impressions)} impressions.</p>
      <ul className="list-disc space-y-2 pl-4 text-sm text-muted">
        <li>{s.matched.toLocaleString("en-US")} ads matched to ads already in Ad Studio</li>
        <li>{s.created.toLocaleString("en-US")} new ads added{s.createdNames.length ? ` (e.g. ${s.createdNames[0]})` : ""}</li>
        {s.keptDays > 0 && <li>{s.keptDays.toLocaleString("en-US")} days kept as stored</li>}
        {s.skipped.length > 0 && <li>{s.skipped.length.toLocaleString("en-US")} skipped</li>}
      </ul>
      {s.skipped.length > 0 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Why were some skipped?</summary>
          <ul className="mt-2 max-h-40 space-y-2 overflow-auto">
            {s.skipped.slice(0, 50).map((k) => <li key={k.name}><span className="font-medium text-ink">{k.name}</span>: {k.reason}</li>)}
          </ul>
        </details>
      )}
      <div className="flex gap-2">
        <Link href="/gallery" className="btn btn-md btn-primary" onClick={onClose}>View ads</Link>
        <button type="button" onClick={onClose} className="btn btn-md btn-secondary">Done</button>
      </div>
    </div>
  );
}
