"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { saveTaxonomySettings } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import type { Taxonomy } from "@/lib/settings";

const GROUPS: { key: keyof Taxonomy; label: string; hint: string }[] = [
  { key: "personas", label: "Personas", hint: "Who the ad speaks to" },
  { key: "funnels", label: "Funnel stages", hint: "Where in the journey" },
  { key: "icps", label: "ICP segments", hint: "Company size or type" },
  { key: "geos", label: "Geos", hint: "Where it runs" },
  { key: "offers", label: "Offers", hint: "What the ad asks for" },
];

export function TaxonomyEditor({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const [tax, setTax] = useState(taxonomy);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const dirty = JSON.stringify(tax) !== JSON.stringify(taxonomy);

  const add = (k: keyof Taxonomy) => {
    const v = (draft[k] ?? "").trim();
    if (!v || tax[k].some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setTax({ ...tax, [k]: [...tax[k], v] });
    setDraft({ ...draft, [k]: "" });
  };
  const save = () => start(async () => {
    const res = await saveTaxonomySettings(tax);
    setMsg(res.ok ? "Saved." : "Couldn't save. Names must be 1–40 characters.");
    if (res.ok) router.refresh();
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Card key={g.key} title={g.label} description={g.hint}>
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {tax[g.key].map((v) => (
                <li key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-periwinkle-100 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-periwinkle-800">{v}
                  <button type="button" aria-label={`Remove ${v} from ${g.label}`} onClick={() => setTax({ ...tax, [g.key]: tax[g.key].filter((x) => x !== v) })} className="grid size-4 place-items-center rounded-full hover:bg-brand-periwinkle-200"><X className="size-3" /></button></li>
              ))}
              {tax[g.key].length === 0 && <li className="text-xs text-brand-neutral-650">None yet</li>}
            </ul>
            <div className="flex gap-2">
              <label className="flex-1"><span className="sr-only">Add to {g.label}</span><input value={draft[g.key] ?? ""} onChange={(e) => setDraft({ ...draft, [g.key]: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(g.key); } }} maxLength={40} placeholder="Add a tag" className="h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm" /></label>
              <Button variant="outline" size="md" onClick={() => add(g.key)}><Plus /> Add</Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-3"><Button disabled={!dirty || pending} onClick={save}>Save changes</Button>{dirty && <Button variant="ghost" onClick={() => setTax(taxonomy)}>Discard</Button>}{msg && <span role="status" className="text-sm text-brand-neutral-750">{msg}</span>}</div>
    </div>
  );
}
