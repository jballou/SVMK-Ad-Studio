"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createBenchmark, removeBenchmark } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Card, DataTable } from "@/components/ui/primitives";
import type { BenchmarkRow } from "@/lib/db/repo";
import { fmtDate } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/ui/colors";
import type { PlatformKey } from "@/lib/specs/platforms";

const field = "h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";
const unit = (m: string) => (m === "cpc" ? "$" : "%");

export function BenchmarkManager({ rows }: { rows: BenchmarkRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ platform: "linkedin", funnel: "Awareness", metric: "ctr", tier: "primary", value: "", source: "Abacus" });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(form.value);
    start(async () => {
      setError("");
      const res = await createBenchmark({ ...form, value });
      if (!res.ok) return setError(res.error ?? "Couldn't save.");
      setForm((f) => ({ ...f, value: "" }));
      router.refresh();
    });
  };
  const remove = (id: number) => start(async () => { await removeBenchmark(id); router.refresh(); });

  return (
    <div className="space-y-6">
      <Card title="Add a benchmark" description="CTR and CVR are percentages (higher is better). CPC is dollars (lower is better). A scorecard tier passes only when every benchmark in it is met.">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7 lg:items-end">
          <label className="text-xs font-medium text-brand-neutral-650">Platform<select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={`${field} mt-1`}>{(["linkedin", "meta", "display", "newsletter"] as PlatformKey[]).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select></label>
          <label className="text-xs font-medium text-brand-neutral-650">Funnel<select value={form.funnel} onChange={(e) => setForm({ ...form, funnel: e.target.value })} className={`${field} mt-1`}>{["Awareness", "Consideration", "Intent"].map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-medium text-brand-neutral-650">Metric<select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className={`${field} mt-1 uppercase`}>{["ctr", "cpc", "cvr"].map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="text-xs font-medium text-brand-neutral-650">Tier<select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={`${field} mt-1`}><option>primary</option><option>secondary</option></select></label>
          <label className="text-xs font-medium text-brand-neutral-650">Value ({unit(form.metric)})<input required type="number" step="any" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={`${field} mt-1`} /></label>
          <label className="text-xs font-medium text-brand-neutral-650">Source<input required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={`${field} mt-1`} /></label>
          <Button type="submit" disabled={pending}><Plus /> Add</Button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-brand-red-500">{error}</p>}
      </Card>

      <Card title={`Benchmarks (${rows.length})`} description="Sample values until the real ones are loaded from Abacus." padded={false}>
        <div className="px-5 py-3">
          <DataTable caption="Benchmarks" columns={[{ label: "Platform" }, { label: "Funnel" }, { label: "Metric" }, { label: "Tier" }, { label: "Target", align: "right" }, { label: "Source" }, { label: "As of" }, { label: "Actions", align: "right" }]}>
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="py-2 pr-3 font-medium">{PLATFORM_LABEL[b.platform as PlatformKey] ?? b.platform}</td>
                <td className="px-3">{b.funnel}</td>
                <td className="px-3 uppercase">{b.metric}</td>
                <td className="px-3 capitalize">{b.tier}</td>
                <td className="px-3 text-right tabular-nums">{b.direction === "higher" ? "≥" : "≤"} {b.metric === "cpc" ? `$${b.value}` : `${b.value}%`}</td>
                <td className="px-3 text-brand-neutral-750">{b.source}</td>
                <td className="px-3 text-brand-neutral-650">{fmtDate(b.asOf)}</td>
                <td className="py-2 pl-3 text-right"><Button variant="ghost" size="sm" mode="icon" disabled={pending} onClick={() => remove(b.id)} aria-label={`Delete ${b.platform} ${b.funnel} ${b.metric} benchmark`}><Trash2 /></Button></td>
              </tr>
            ))}
          </DataTable>
        </div>
      </Card>
    </div>
  );
}
