"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addPlatform, removePlatform } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import { PLATFORM_PALETTE } from "@/lib/specs/custom";

export interface PlatformRow {
  key: string;
  label: string;
  color: string;
  builtin: boolean;
  ads: number;
  placements: { label: string; sizes: string; verified: boolean }[];
}

const field = "h-9 w-full rounded-tight border border-brand-neutral-250 bg-white px-2 text-sm";

export function PlatformManager({ platforms }: { platforms: PlatformRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(PLATFORM_PALETTE[0]);
  const [ctaRequired, setCtaRequired] = useState(true);
  const [placements, setPlacements] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotes([]);
    start(async () => {
      const res = await addPlatform({ label, color, ctaRequired, placements });
      if (!res.ok) { setError(res.error); return; }
      setNotes(res.warnings);
      setLabel(""); setPlacements("");
      router.refresh();
    });
  };
  const remove = (key: string) => start(async () => {
    setError("");
    const res = await removePlatform(key);
    if (!res.ok) setError(res.error ?? "Couldn't remove it.");
    else router.refresh();
  });

  return (
    <div className="space-y-4">
      <Card title="Add a platform or vendor" description="It appears in filters, batches, benchmarks, scorecards and exports right away. Sizes are taken as entered, so check them against the vendor's spec.">
        <form onSubmit={add} className="grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-medium text-brand-neutral-650">Name
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} required placeholder="e.g. Spotify, Reddit, TikTok" className={`${field} mt-0`} />
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-brand-neutral-650">Color</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_PALETTE.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="platform-color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
                  <span className="block size-7 rounded-round ring-offset-2 peer-checked:ring-2 peer-focus-visible:ring-2 ring-brand-neutral-900" style={{ background: c }} />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-xs font-medium text-brand-neutral-650 lg:col-span-2">Placements and sizes
            <textarea value={placements} onChange={(e) => setPlacements(e.target.value)} required rows={4} placeholder={"One placement per line:\nFeed: 1200x628, 1200x1200\nStory: 1080x1920"} className="mt-0 w-full rounded-tight border border-brand-neutral-250 bg-white px-2 py-2 font-mono text-sm" />
            <span className="mt-0 block font-normal">Name, a colon, then sizes as width x height. With no colon the platform name is used.</span>
          </label>
          <label className="flex items-start gap-2 text-sm lg:col-span-2">
            <input type="checkbox" checked={ctaRequired} onChange={(e) => setCtaRequired(e.target.checked)} className="mt-0 accent-brand-green-600" />
            <span>The creative must carry its own call to action<span className="block text-xs text-brand-neutral-650">Turn off when the platform adds its own button, as LinkedIn and Meta do.</span></span>
          </label>
          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <Button type="submit" disabled={pending || !label.trim() || !placements.trim()}><Plus /> Add platform</Button>
            {error && <span role="alert" className="text-sm text-brand-red-500">{error}</span>}
          </div>
          {notes.length > 0 && <ul role="status" className="space-y-0 text-sm text-brand-orange-600 lg:col-span-2">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </form>
      </Card>

      <Card title="Platforms" description="Built-in platforms can't be removed. Added ones can, once no ads use them." padded={false}>
        <ul className="divide-y divide-brand-neutral-150">
          {platforms.map((p) => (
            <li key={p.key} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium"><span aria-hidden className="size-2.5 rounded-round" style={{ background: p.color }} />{p.label}{!p.builtin && <span className="rounded-round bg-brand-periwinkle-100 px-2 py-0 text-xs font-medium text-brand-periwinkle-800">Added</span>}</p>
                <ul className="mt-0 space-y-0 text-xs text-brand-neutral-650">
                  {p.placements.map((pl) => <li key={pl.label}>{pl.label}: {pl.sizes}{!pl.verified && <span className="text-brand-orange-600"> · spec not verified</span>}</li>)}
                </ul>
              </div>
              <div className="flex items-center gap-4 text-xs text-brand-neutral-650">
                <span>{p.ads} ad{p.ads === 1 ? "" : "s"}</span>
                {!p.builtin && <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(p.key)} aria-label={`Remove ${p.label}`}><Trash2 /> Remove</Button>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
