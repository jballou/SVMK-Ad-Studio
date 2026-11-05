"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { AdArt } from "@/components/ads/AdArt";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import { filterGallery, galleryItems, intentCounts } from "@/lib/batches/gallery";
import { artFor } from "@/lib/dummy/library";
import { STARTER_TEMPLATES } from "@/lib/templates/intents";

const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : "border-brand-neutral-250 bg-white text-brand-neutral-750 hover:bg-brand-neutral-100"}`;
const select = "h-9 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";

export function ConceptGallery({ selected, onToggle, customRequestUrl }: { selected: string[]; onToggle: (key: string) => void; customRequestUrl: string }) {
  const all = useMemo(() => galleryItems(), []);
  const counts = useMemo(() => intentCounts(all), [all]);
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<string | null>(null);
  const [funnel, setFunnel] = useState("");
  const [persona, setPersona] = useState("");
  const shown = useMemo(() => filterGallery(all, { query, intent, funnel: funnel || null, persona: persona || null }), [all, query, intent, funnel, persona]);
  const personas = useMemo(() => [...new Set(all.flatMap((i) => i.concept.personas))].sort(), [all]);
  const funnels = useMemo(() => [...new Set(all.map((i) => i.concept.funnel))], [all]);
  const filtered = !!(query || intent || funnel || persona);

  return (
    <Card
      title="Choose your concepts"
      description="Pick one for a single ad, or several for a batch. Browse by creative intent, or search by name, copy, persona or offer."
      actions={
        customRequestUrl ? (
          <Button variant="outline" size="sm" asChild><a href={customRequestUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> Request custom ad</a></Button>
        ) : (
          <Button variant="outline" size="sm" disabled title="The Brand Creative Hub link isn't configured yet"><ExternalLink /> Request custom ad</Button>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-64">
            <span className="sr-only">Search concepts</span>
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-neutral-550" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search concepts, copy, persona, offer…" className={`${select} w-full pl-8`} />
          </label>
          <label className="sr-only" htmlFor="gal-funnel">Funnel stage</label>
          <select id="gal-funnel" value={funnel} onChange={(e) => setFunnel(e.target.value)} className={select}><option value="">All funnel stages</option>{funnels.map((f) => <option key={f}>{f}</option>)}</select>
          <label className="sr-only" htmlFor="gal-persona">Persona</label>
          <select id="gal-persona" value={persona} onChange={(e) => setPersona(e.target.value)} className={select}><option value="">All personas</option>{personas.map((p) => <option key={p}>{p}</option>)}</select>
        </div>

        <div role="group" aria-label="Creative intent" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={intent === null} onClick={() => setIntent(null)} className={chip(intent === null)}>All intents <span className="tabular-nums text-brand-neutral-650">{all.length}</span></button>
          {STARTER_TEMPLATES.filter((t) => counts.has(t.slug)).map((t) => (
            <button key={t.slug} type="button" aria-pressed={intent === t.slug} onClick={() => setIntent(intent === t.slug ? null : t.slug)} title={t.description} className={chip(intent === t.slug)}>{t.name} <span className="tabular-nums text-brand-neutral-650">{counts.get(t.slug)}</span></button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-brand-neutral-650" role="status">
          <span>{shown.length} of {all.length} concepts</span>
          {filtered && <button type="button" onClick={() => { setQuery(""); setIntent(null); setFunnel(""); setPersona(""); }} className="inline-flex items-center gap-1 font-medium text-brand-green-600 hover:underline"><X className="size-3" aria-hidden />Clear filters</button>}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-neutral-250 p-8 text-center text-sm text-brand-neutral-650">
            <p className="font-medium text-brand-neutral-850">No concepts match.</p>
            <p className="mt-1">Try fewer filters, or request something custom from the Brand Creative Hub.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map(({ concept: c, intentName }) => {
              const on = selected.includes(c.key);
              return (
                <li key={c.key}>
                  <label className={`block h-full cursor-pointer rounded-xl border p-2 ${on ? "border-brand-green-600 bg-brand-green-100/40" : "border-brand-neutral-200 hover:bg-brand-neutral-50"}`}>
                    <span className="mb-2 block overflow-hidden rounded"><AdArt art={artFor(c)} copy={c} width={1200} height={1200} showCta={false} /></span>
                    <span className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={() => onToggle(c.key)} aria-label={`Select ${c.key}`} className="accent-brand-green-600" /><span className="truncate font-medium">{c.key}</span></span>
                    <span className="ml-6 block text-xs font-medium text-brand-green-700">{intentName}</span>
                    <span className="ml-6 block text-xs text-brand-neutral-650">{c.funnel} · {c.personas.join(", ")}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
