"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { saveAdTags, updateAdStatus } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import type { AdStatus } from "@/lib/ads/types";
import { STATUSES } from "@/lib/ads/types";

export function StatusControl({ name, status }: { name: string; status: AdStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const set = (s: AdStatus) =>
    start(async () => {
      setError("");
      try {
        const res = await updateAdStatus({ name, status: s });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setError("Couldn't update status.");
      }
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "live" ? (
        <Button variant="outline" size="md" disabled={pending} onClick={() => set("paused")}>Pause ad</Button>
      ) : status === "paused" ? (
        <Button size="md" disabled={pending} onClick={() => set("live")}>Resume ad</Button>
      ) : null}
      <label className="text-xs text-brand-neutral-650">
        <span className="sr-only">Set status</span>
        <select value={status} disabled={pending} onChange={(e) => set(e.target.value as AdStatus)} className="h-8.5 rounded-md border border-brand-neutral-250 bg-white px-2 text-sm capitalize">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {error && <span role="alert" className="text-xs text-brand-red-500">{error}</span>}
    </div>
  );
}

type Tags = { persona: string[]; funnel?: string; icp?: string[]; geo?: string[]; offer?: string };

const GROUPS: { key: "persona" | "icp" | "geo"; label: string; options: string[] }[] = [
  { key: "persona", label: "Persona", options: ["CX", "Marketing", "EX", "IT", "Enterprise"] },
  { key: "icp", label: "ICP", options: ["Enterprise", "Mid-market", "SMB"] },
  { key: "geo", label: "Geo", options: ["US", "UK", "CA", "AU"] },
];

export function TagEditor({ name, tags }: { name: string; tags: Tags }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Tags>(tags);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const save = (next: Tags) => {
    const prev = current;
    setCurrent(next);
    start(async () => {
      setError("");
      try {
        const res = await saveAdTags({ name, tags: next });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setCurrent(prev);
        setError("Couldn't save tags.");
      }
    });
  };

  return (
    <div className="space-y-4" aria-busy={pending}>
      {GROUPS.map((g) => {
        const values = current[g.key] ?? [];
        const addable = g.options.filter((o) => !values.includes(o));
        return (
          <div key={g.key}>
            <p className="mb-1.5 text-xs font-medium text-brand-neutral-650">{g.label}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {values.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-periwinkle-100 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-periwinkle-800">
                  {v}
                  <button type="button" aria-label={`Remove ${v} from ${g.label}`} onClick={() => save({ ...current, [g.key]: values.filter((x) => x !== v) })} className="grid size-4 place-items-center rounded-full hover:bg-brand-periwinkle-200"><X className="size-3" /></button>
                </span>
              ))}
              {addable.length > 0 && (
                <label className="inline-flex items-center">
                  <span className="sr-only">Add {g.label}</span>
                  <select value="" onChange={(e) => e.target.value && save({ ...current, [g.key]: [...values, e.target.value] })} className="h-7 rounded-full border border-dashed border-brand-neutral-300 bg-white px-2 text-xs text-brand-neutral-750">
                    <option value="">+ Add</option>
                    {addable.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-brand-neutral-650">Funnel stage
          <select value={current.funnel ?? ""} onChange={(e) => save({ ...current, funnel: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2 text-sm">
            <option value="">None</option>{["Awareness", "Consideration", "Intent"].map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-brand-neutral-650">Offer
          <select value={current.offer ?? ""} onChange={(e) => save({ ...current, offer: e.target.value || undefined })} className="mt-1 h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2 text-sm">
            <option value="">None</option>{["Brand", "Demo", "Free trial", "Report", "Guide", "Webinar"].map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-xs text-brand-red-500">{error}</p>}
      <p className="flex items-center gap-1 text-[11px] text-brand-neutral-550"><Plus className="size-3" aria-hidden /> Changes save automatically.</p>
    </div>
  );
}
