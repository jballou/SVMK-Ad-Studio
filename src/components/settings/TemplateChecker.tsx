"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheck, CircleX, Info } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import type { TemplateIssue, TemplateReport } from "@/lib/figma/validate-template";

type Result = TemplateReport & { fileKey: string; nodeName: string };

function Issue({ i }: { i: TemplateIssue }) {
  const Icon = i.severity === "error" ? CircleX : i.severity === "warn" ? AlertTriangle : Info;
  const color = i.severity === "error" ? "text-brand-red-500" : i.severity === "warn" ? "text-brand-orange-600" : "text-brand-neutral-550";
  return <li className="flex items-start gap-2 text-sm"><Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden /><span><span className="sr-only">{i.severity}: </span>{i.message}</span></li>;
}

/** Paste a link to a Figma page or section and see what Ad Studio will and won't understand. */
export function TemplateChecker() {
  const [url, setUrl] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Result | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setReport(null);
    try {
      const res = await fetch("/api/figma/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, legacy }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't check that link.");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check that link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Check a Figma template" description="Paste a link to the page or section that holds your concept frames. Needs FIGMA_TOKEN on the server (or run npm run figma:check locally).">
      <form onSubmit={run} className="space-y-3">
        <div className="flex gap-2">
          <label className="flex-1"><span className="sr-only">Figma link</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…?node-id=…" className="h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40" /></label>
          <Button type="submit" disabled={busy || !url.trim()}>{busy ? "Checking…" : "Check"}</Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-brand-neutral-650"><input type="checkbox" checked={legacy} onChange={(e) => setLegacy(e.target.checked)} className="accent-brand-green-600" />Also accept old names like “LI Marketing Ad #1_1200x1200”</label>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-700">{error}</p>}
      {report && (
        <div className="mt-4 space-y-4" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <strong className="font-semibold">{report.nodeName}</strong>
            {report.counts.errors === 0 ? <span className="inline-flex items-center gap-1 text-brand-green-700"><CircleCheck className="size-4" aria-hidden />Ready to use</span> : <span className="text-brand-red-500">{report.counts.errors} error{report.counts.errors === 1 ? "" : "s"} to fix</span>}
            <span className="text-brand-neutral-650">{report.counts.warnings} warning{report.counts.warnings === 1 ? "" : "s"} · {report.counts.info} note{report.counts.info === 1 ? "" : "s"}</span>
          </p>
          {report.issues.length > 0 && <ul className="space-y-1.5">{report.issues.map((i, k) => <Issue key={k} i={i} />)}</ul>}
          {report.concepts.map((c) => (
            <details key={c.conceptKey} open={c.sizes.some((s) => s.issues.some((i) => i.severity !== "info")) || c.issues.some((i) => i.severity !== "info")} className="rounded-lg border border-brand-neutral-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{c.conceptKey} <span className="font-normal text-brand-neutral-650">· {c.sizes.length} size{c.sizes.length === 1 ? "" : "s"}</span></summary>
              <div className="space-y-3 border-t border-brand-neutral-150 p-3">
                {c.issues.length > 0 && <ul className="space-y-1.5">{c.issues.map((i, k) => <Issue key={k} i={i} />)}</ul>}
                {c.sizes.map((s) => (
                  <div key={s.nodeId}>
                    <p className="text-sm font-medium">{s.width}×{s.height} <span className="font-normal text-brand-neutral-650">{s.slots.map((x) => `#${x}`).join(" ")}</span></p>
                    {s.issues.length > 0 ? <ul className="mt-1 space-y-1.5">{s.issues.map((i, k) => <Issue key={k} i={i} />)}</ul> : <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-green-700"><CircleCheck className="size-3.5" aria-hidden />No issues</p>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
