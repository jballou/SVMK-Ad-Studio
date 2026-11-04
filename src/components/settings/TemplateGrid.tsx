"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { artFor, conceptByKey, type TemplateFile } from "@/lib/dummy/library";
import { fmtDate } from "@/lib/format";

export function TemplateGrid({ templates }: { templates: TemplateFile[] }) {
  const [synced, setSynced] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const sync = (id: string) => {
    setBusy(id);
    setTimeout(() => { setSynced((s) => ({ ...s, [id]: new Date().toLocaleDateString("en-CA") })); setBusy(null); }, 1400);
  };
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => {
        const last = synced[t.id] ?? t.lastSynced;
        const stale = t.status === "stale" && !synced[t.id];
        return (
          <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-brand-neutral-200 bg-white p-4">
            <div className="flex gap-2">
              {t.concepts.slice(0, 3).map((k) => { const c = conceptByKey(k)!; return <span key={k} className="w-1/3 overflow-hidden rounded border border-brand-neutral-200"><AdArt art={artFor(c)} copy={c} width={1200} height={1200} showCta={false} /></span>; })}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{t.name}</h3>
              <p className="mt-0.5 truncate font-mono text-[11px] text-brand-neutral-550">{t.fileKey}</p>
            </div>
            <p className="text-xs text-brand-neutral-650">{t.concepts.length} concepts · {t.frameCount} frames · synced {fmtDate(last)}</p>
            <div className="mt-auto flex items-center justify-between gap-2">
              {stale ? <Chip variant="pending" icon={AlertTriangle} chevron={false} className="!px-2.5 !py-1 !text-xs">Stale</Chip> : <Chip variant="completed" chevron={false} className="!px-2.5 !py-1 !text-xs">Synced</Chip>}
              <Button variant="outline" size="sm" disabled={busy === t.id} onClick={() => sync(t.id)} aria-label={`Sync ${t.name}`}><RefreshCw className={busy === t.id ? "animate-spin" : ""} />{busy === t.id ? "Syncing…" : "Sync now"}</Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
