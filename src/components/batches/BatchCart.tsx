"use client";

import { ArrowRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { ConceptThumb } from "@/components/batches/ConceptThumb";
import { conceptIntent } from "@/lib/dummy/concepts";
import { conceptByKey } from "@/lib/dummy/library";
import { STARTER_TEMPLATES } from "@/lib/templates/intents";

/** A running list of what the user has picked, like a cart: each concept, and how many ads it will produce. */
export function BatchCart({ picked, onRemove, onClear, adsToCreate, alreadyExist, placements, copyErrors, step, onContinue, canContinue, reason, nextLabel }: {
  picked: string[];
  onRemove: (key: string) => void;
  onClear: () => void;
  adsToCreate: number;
  alreadyExist: number;
  placements: number;
  copyErrors: number;
  step: number;
  onContinue: () => void;
  canContinue: boolean;
  reason: string;
  nextLabel: string;
}) {
  const single = picked.length === 1;
  return (
    <aside aria-label="Your batch" className="h-fit rounded-loose border border-brand-neutral-200 bg-white p-4 text-sm lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{single ? "Your ad" : "Your batch"} <span className="font-normal text-brand-neutral-650">({picked.length})</span></h2>
        {picked.length > 0 && <button type="button" onClick={onClear} className="inline-flex items-center gap-2 text-xs font-medium text-brand-neutral-650 hover:text-brand-red-500"><Trash2 className="size-3" aria-hidden />Clear</button>}
      </div>

      {picked.length === 0 ? (
        <p className="mt-4 text-xs text-brand-neutral-650">Nothing yet. Select a concept to make a single ad, or several to make a batch.</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-2">
          {picked.map((k) => {
            const c = conceptByKey(k);
            const intent = STARTER_TEMPLATES.find((t) => t.slug === conceptIntent(k))?.name;
            return (
              <li key={k} className="flex items-center gap-2 rounded-tight border border-brand-neutral-150 p-2">
                <span className="block w-12 shrink-0 overflow-hidden rounded-tight">{c && <ConceptThumb concept={c} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{k}</span><span className="block truncate text-xs text-brand-neutral-650">{intent}</span></span>
                <button type="button" onClick={() => onRemove(k)} aria-label={`Remove ${k}`} className="grid size-6 shrink-0 place-items-center rounded-tight text-brand-neutral-650 hover:bg-brand-neutral-100 hover:text-brand-red-500"><X className="size-3.5" aria-hidden /></button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 border-t border-brand-neutral-150 pt-4">
        {step >= 2 && <p className="mb-0 text-xs text-brand-neutral-650">{placements} placement{placements === 1 ? "" : "s"} selected</p>}
        <p className="text-xs text-brand-neutral-650">{step >= 2 ? "Ads to create" : "Sizes are chosen in the Platforms step"}</p>
        {step >= 2 && <p className="text-2xl font-semibold tabular-nums">{adsToCreate}</p>}
        {step >= 2 && alreadyExist > 0 && <p className="text-xs text-brand-orange-600">{alreadyExist} already exist and will be skipped</p>}
        {copyErrors > 0 && <p className="mt-0 text-xs text-brand-red-500">{copyErrors} copy error{copyErrors === 1 ? "" : "s"} to fix</p>}
      </div>

      {picked.length > 0 && step < 4 && (
        <div className="mt-4">
          <Button onClick={onContinue} disabled={!canContinue} className="w-full">Continue to {nextLabel.toLowerCase()} <ArrowRight /></Button>
          {!canContinue && <p className="mt-2 text-xs text-brand-neutral-650" role="status">{reason}</p>}
        </div>
      )}
    </aside>
  );
}
