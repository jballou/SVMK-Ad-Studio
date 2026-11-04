"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, LayoutGrid, List, Rows3, Search, X } from "lucide-react";
import { updateAdStatus } from "@/app/actions";
import { AdArt } from "@/components/ads/AdArt";
import { PlatformBadge, StatusChip } from "@/components/ads/badges";
import { Button } from "@/components/ui/button-1";
import { EmptyState } from "@/components/ui/primitives";
import { distinct, filterAds, setStatus, sortAds } from "@/lib/ads/query";
import { STATUSES, type AdRecord, type AdStatus, type SortKey, type ViewMode } from "@/lib/ads/types";
import { fmtCompact, fmtDate, fmtPct } from "@/lib/format";

export interface AdStat {
  impressions: number;
  ctr?: number;
}

const PAGE = 48;
const SORTS: { value: SortKey | "ctr" | "impressions"; label: string }[] = [
  { value: "launched", label: "Newest launch" },
  { value: "ctr", label: "Highest CTR" },
  { value: "impressions", label: "Most impressions" },
  { value: "name", label: "Name" },
  { value: "platform", label: "Platform" },
  { value: "status", label: "Status" },
];

const selectCls = "h-9 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";

function StatusSelect({ ad, onChange }: { ad: AdRecord; onChange: (s: AdStatus) => void }) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Status for {ad.name}</span>
      <select value={ad.status} onChange={(e) => onChange(e.target.value as AdStatus)} className="h-7 rounded-md border border-brand-neutral-250 bg-white px-1.5 text-xs capitalize text-brand-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-green-400/60">
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}

function Tags({ ad, max = 5 }: { ad: AdRecord; max?: number }) {
  const tags = [...ad.tags.persona, ad.tags.funnel, ad.tags.offer, ...(ad.tags.geo ?? [])].filter(Boolean) as string[];
  return (
    <ul className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => <li key={t} className="rounded bg-brand-neutral-150 px-1.5 py-0.5 text-[11px] text-brand-neutral-750">{t}</li>)}
      {tags.length > max && <li className="px-1 py-0.5 text-[11px] text-brand-neutral-650">+{tags.length - max}</li>}
    </ul>
  );
}

function Thumb({ ad, max }: { ad: AdRecord; max: number }) {
  const r = ad.width / ad.height;
  const w = r >= 1 ? max : Math.round(max * r);
  return <div style={{ width: w }} className="overflow-hidden rounded-md border border-brand-neutral-200"><AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={max > 90} /></div>;
}

export function Gallery({ initial, stats, initialFilters = {} }: { initial: AdRecord[]; stats: Record<string, AdStat>; initialFilters?: { q?: string; status?: string; platform?: string } }) {
  const [ads, setAds] = useState(initial);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<string>("launched");
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [platform, setPlatform] = useState(initialFilters.platform ?? "");
  const [status, setStatusFilter] = useState(initialFilters.status ?? "");
  const [persona, setPersona] = useState("");
  const [funnel, setFunnel] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const update = async (ad: AdRecord, s: AdStatus) => {
    const next = setStatus(ad, s, new Date().toLocaleDateString("en-CA"));
    setAds((all) => all.map((a) => (a.id === ad.id ? next : a)));
    setError("");
    try {
      const res = await updateAdStatus({ name: ad.name, status: s });
      if (!res.ok) throw new Error("not found");
    } catch {
      setAds((all) => all.map((a) => (a.id === ad.id ? ad : a)));
      setError(`Couldn't update ${ad.name}. Try again.`);
    }
  };

  const shown = useMemo(() => {
    const filtered = filterAds(ads, { q, platform: platform || undefined, status: (status || undefined) as AdStatus | undefined, persona: persona || undefined, funnel: funnel || undefined });
    if (sort === "ctr") return [...filtered].sort((a, b) => (stats[b.name]?.ctr ?? -1) - (stats[a.name]?.ctr ?? -1));
    if (sort === "impressions") return [...filtered].sort((a, b) => (stats[b.name]?.impressions ?? -1) - (stats[a.name]?.impressions ?? -1));
    return sortAds(filtered, sort as SortKey);
  }, [ads, q, platform, status, persona, funnel, sort, stats]);

  const filtersActive = !!(q || platform || status || persona || funnel);
  const clear = () => { setQ(""); setPlatform(""); setStatusFilter(""); setPersona(""); setFunnel(""); setLimit(PAGE); };
  const visible = shown.slice(0, limit);
  const toggle = (name: string) => setPicked((s) => { const n = new Set(s); if (n.has(name)) n.delete(name); else n.add(name); return n; });
  const exportHref = `/export?ads=${encodeURIComponent([...picked].slice(0, 60).join(","))}`;

  // A plain function (not a component) so checkboxes keep focus across re-renders.
  const pick = (ad: AdRecord) => (
    <input type="checkbox" checked={picked.has(ad.name)} onChange={() => toggle(ad.name)} aria-label={`Select ${ad.name}`} className="size-4 accent-brand-green-600" />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-neutral-200 bg-white p-3">
        <label className="text-xs font-medium text-brand-neutral-650">Search
          <span className="relative mt-1 block"><Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-neutral-550" /><input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Ad or concept" className={`${selectCls} w-48 pl-8`} /></span>
        </label>
        <label className="text-xs font-medium text-brand-neutral-650">Platform<select value={platform} onChange={(e) => { setPlatform(e.target.value); setLimit(PAGE); }} className={`${selectCls} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => [a.platform]).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Status<select value={status} onChange={(e) => { setStatusFilter(e.target.value); setLimit(PAGE); }} className={`${selectCls} mt-1 block capitalize`}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Persona<select value={persona} onChange={(e) => { setPersona(e.target.value); setLimit(PAGE); }} className={`${selectCls} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => a.tags.persona).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Funnel<select value={funnel} onChange={(e) => { setFunnel(e.target.value); setLimit(PAGE); }} className={`${selectCls} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => (a.tags.funnel ? [a.tags.funnel] : [])).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Sort<select value={sort} onChange={(e) => setSort(e.target.value)} className={`${selectCls} mt-1 block`}>{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        {filtersActive && <Button variant="ghost" size="md" onClick={clear}><X /> Clear</Button>}
        <div className="ml-auto inline-flex gap-1 rounded-lg bg-brand-neutral-150 p-1" role="group" aria-label="View">
          {([["grid", LayoutGrid, "Grid"], ["gallery", Rows3, "Gallery"], ["list", List, "List"]] as const).map(([v, Icon, label]) => (
            <Button key={v} variant={view === v ? "outline" : "ghost"} size="sm" aria-pressed={view === v} onClick={() => setView(v)} className={view === v ? "" : "bg-transparent"}><Icon /> {label}</Button>
          ))}
        </div>
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-3">
        <p className="text-sm text-brand-neutral-650" aria-live="polite">{shown.length} of {ads.length} ads</p>
        {picked.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-brand-neutral-750">{picked.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>Clear</Button>
            <Button size="sm" asChild><Link href={exportHref}><Download /> Export</Link></Button>
          </div>
        )}
      </div>
      {error && <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-700" role="alert">{error}</p>}

      {shown.length === 0 && <EmptyState title="No ads match these filters" body="Try removing a filter or searching for a different concept." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />}

      {view === "grid" && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((ad) => (
            <li key={ad.id} className="group flex flex-col gap-2 rounded-xl border border-brand-neutral-200 bg-white p-2.5">
              <div className="relative flex h-36 items-center justify-center rounded-lg bg-brand-neutral-100 p-2">
                <Link href={`/gallery/${ad.name}`} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500" aria-label={`Open ${ad.name}`}><Thumb ad={ad} max={110} /></Link>
                <span className="absolute left-2 top-2 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">{pick(ad)}</span>
              </div>
              <Link href={`/gallery/${ad.name}`} className="truncate text-xs font-medium hover:underline" title={ad.name}>{ad.name}</Link>
              <div className="flex items-center justify-between gap-1"><StatusChip status={ad.status} /><span className="text-[11px] tabular-nums text-brand-neutral-650">{fmtPct(stats[ad.name]?.ctr)}</span></div>
            </li>
          ))}
        </ul>
      )}

      {view === "gallery" && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((ad) => (
            <li key={ad.id} className="flex flex-col gap-3 rounded-xl border border-brand-neutral-200 bg-white p-4">
              <div className="flex h-72 items-center justify-center rounded-lg bg-brand-neutral-100 p-3"><Link href={`/gallery/${ad.name}`} aria-label={`Open ${ad.name}`}><Thumb ad={ad} max={260} /></Link></div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/gallery/${ad.name}`} className="block truncate text-sm font-semibold hover:underline">{ad.name}</Link>
                  <p className="mt-0.5 text-xs text-brand-neutral-650">{ad.campaign} · {ad.launchedAt ? `launched ${fmtDate(ad.launchedAt)}` : "not launched"}{ad.pausedAt ? ` · paused ${fmtDate(ad.pausedAt)}` : ""}</p>
                </div>
                {pick(ad)}
              </div>
              <div className="flex items-center gap-3"><PlatformBadge platform={ad.platform} /><span className="text-xs text-brand-neutral-650">{fmtCompact(stats[ad.name]?.impressions ?? 0)} impr · CTR {fmtPct(stats[ad.name]?.ctr)}</span></div>
              <Tags ad={ad} />
              <div className="mt-auto flex items-center justify-between"><StatusChip status={ad.status} /><StatusSelect ad={ad} onChange={(s) => update(ad, s)} /></div>
            </li>
          ))}
        </ul>
      )}

      {view === "list" && (
        <div className="overflow-x-auto rounded-xl border border-brand-neutral-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">Ads</caption>
            <thead className="border-b border-brand-neutral-200 text-xs text-brand-neutral-650">
              <tr><th className="w-10 px-3 py-2"><span className="sr-only">Select</span></th><th className="px-2 py-2 font-medium">Creative</th><th className="px-2 font-medium">Name</th><th className="px-2 font-medium">Platform</th><th className="px-2 font-medium">Launched</th><th className="px-2 text-right font-medium">Impr.</th><th className="px-2 text-right font-medium">CTR</th><th className="px-2 font-medium">Tags</th><th className="px-3 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-neutral-150">
              {visible.map((ad) => (
                <tr key={ad.id} className="hover:bg-brand-neutral-50">
                  <td className="px-3 py-2">{pick(ad)}</td>
                  <td className="px-2 py-2"><Link href={`/gallery/${ad.name}`} aria-label={`Open ${ad.name}`}><Thumb ad={ad} max={56} /></Link></td>
                  <td className="px-2"><Link href={`/gallery/${ad.name}`} className="font-medium hover:underline">{ad.name}</Link><span className="block text-xs text-brand-neutral-650">{ad.campaign}</span></td>
                  <td className="px-2"><PlatformBadge platform={ad.platform} /><span className="block text-xs text-brand-neutral-650">{ad.width}×{ad.height}</span></td>
                  <td className="px-2 text-brand-neutral-750">{fmtDate(ad.launchedAt)}{ad.pausedAt && <span className="block text-xs text-brand-orange-600">paused {fmtDate(ad.pausedAt)}</span>}</td>
                  <td className="px-2 text-right tabular-nums">{fmtCompact(stats[ad.name]?.impressions ?? 0)}</td>
                  <td className="px-2 text-right tabular-nums">{fmtPct(stats[ad.name]?.ctr)}</td>
                  <td className="px-2"><Tags ad={ad} max={3} /></td>
                  <td className="px-3"><div className="flex items-center gap-2"><StatusChip status={ad.status} /><StatusSelect ad={ad} onChange={(s) => update(ad, s)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shown.length > visible.length && (
        <div className="flex justify-center pt-2"><Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, shown.length - visible.length)} more ({shown.length - visible.length} remaining)</Button></div>
      )}
    </div>
  );
}
