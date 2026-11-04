"use client";

import { useEffect, useMemo, useState } from "react";
import { distinct, filterAds, setStatus, sortAds } from "@/lib/ads/query";
import { STATUSES, type AdRecord, type AdStatus, type SortKey, type ViewMode } from "@/lib/ads/types";

const STORAGE_KEY = "ad-studio:status-overrides";
const PLATFORM_COLOR: Record<AdRecord["platform"], string> = {
  linkedin: "bg-sky-100 text-sky-900",
  meta: "bg-indigo-100 text-indigo-900",
  display: "bg-amber-100 text-amber-900",
  newsletter: "bg-rose-100 text-rose-900",
};
const STATUS_STYLE: Record<AdStatus, string> = {
  draft: "bg-neutral-200 text-neutral-800",
  live: "bg-emerald-100 text-emerald-900",
  paused: "bg-amber-100 text-amber-900",
  retired: "bg-neutral-300 text-neutral-700",
};

function Thumb({ ad, max }: { ad: AdRecord; max: number }) {
  const r = ad.width / ad.height;
  const w = r >= 1 ? max : Math.round(max * r);
  return (
    <div
      className={`flex items-center justify-center rounded text-[10px] ${PLATFORM_COLOR[ad.platform]}`}
      style={{ width: w, aspectRatio: `${ad.width} / ${ad.height}` }}
      role="img"
      aria-label={`${ad.width} by ${ad.height} creative`}
    >
      {ad.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.imageUrl} alt="" className="h-full w-full rounded object-cover" />
      ) : (
        `${ad.width}×${ad.height}`
      )}
    </div>
  );
}

function StatusSelect({ ad, onChange }: { ad: AdRecord; onChange: (s: AdStatus) => void }) {
  return (
    <label className="inline-flex items-center gap-1 text-xs">
      <span className="sr-only">Status for {ad.name}</span>
      <select
        value={ad.status}
        onChange={(e) => onChange(e.target.value as AdStatus)}
        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[ad.status]}`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}

function Tags({ ad }: { ad: AdRecord }) {
  const tags = [...ad.tags.persona, ad.tags.funnel, ...(ad.tags.geo ?? [])].filter(Boolean) as string[];
  return (
    <ul className="flex flex-wrap gap-1">
      {tags.map((t) => <li key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700">{t}</li>)}
    </ul>
  );
}

export function Gallery({ initial }: { initial: AdRecord[] }) {
  const [overrides, setOverrides] = useState<Record<string, { status: AdStatus; pausedAt?: string }>>({});
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("launched");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatusFilter] = useState("");
  const [persona, setPersona] = useState("");
  const [funnel, setFunnel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // Read after mount so server and first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      /* storage unavailable: statuses just won't persist */
    }
  }, []);

  const ads = useMemo(
    () => initial.map((a) => (overrides[a.id] ? { ...a, ...overrides[a.id] } : a)),
    [initial, overrides],
  );

  const update = (ad: AdRecord, s: AdStatus) => {
    const next = setStatus(ad, s, new Date().toLocaleDateString("en-CA"));
    const o = { ...overrides, [ad.id]: { status: next.status, pausedAt: next.pausedAt } };
    setOverrides(o);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
    } catch {
      /* ignore */
    }
  };

  const shown = useMemo(
    () => sortAds(filterAds(ads, { q, platform: platform || undefined, status: (status || undefined) as AdStatus | undefined, persona: persona || undefined, funnel: funnel || undefined }), sort),
    [ads, q, platform, status, persona, funnel, sort],
  );

  const sel = "rounded border border-neutral-300 bg-white px-2 py-1 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">Search<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad or concept name" className={`${sel} mt-1 block w-48`} /></label>
        <label className="text-xs">Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${sel} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => [a.platform]).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs">Status<select value={status} onChange={(e) => setStatusFilter(e.target.value)} className={`${sel} mt-1 block`}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs">Persona<select value={persona} onChange={(e) => setPersona(e.target.value)} className={`${sel} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => a.tags.persona).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs">Funnel<select value={funnel} onChange={(e) => setFunnel(e.target.value)} className={`${sel} mt-1 block`}><option value="">All</option>{distinct(ads, (a) => (a.tags.funnel ? [a.tags.funnel] : [])).map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs">Sort<select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${sel} mt-1 block`}><option value="launched">Newest launch</option><option value="name">Name</option><option value="platform">Platform</option><option value="status">Status</option></select></label>
        <div className="ml-auto inline-flex overflow-hidden rounded border border-neutral-300" role="group" aria-label="View">
          {(["grid", "gallery", "list"] as ViewMode[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1 text-sm capitalize ${view === v ? "bg-neutral-900 text-white" : "bg-white"}`}>{v}</button>
          ))}
        </div>
      </div>

      <p className="text-sm text-neutral-600" aria-live="polite">{shown.length} of {ads.length} ads</p>

      {shown.length === 0 && <p className="rounded border border-dashed p-8 text-center text-sm text-neutral-500">No ads match these filters.</p>}

      {view === "grid" && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {shown.map((ad) => (
            <li key={ad.id} className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <div className="flex h-28 items-center justify-center"><Thumb ad={ad} max={110} /></div>
              <p className="truncate text-xs font-medium" title={ad.name}>{ad.name}</p>
              <StatusSelect ad={ad} onChange={(s) => update(ad, s)} />
            </li>
          ))}
        </ul>
      )}

      {view === "gallery" && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ad) => (
            <li key={ad.id} className="space-y-3 rounded-lg border border-neutral-200 p-4">
              <div className="flex h-64 items-center justify-center"><Thumb ad={ad} max={240} /></div>
              <div>
                <p className="text-sm font-semibold">{ad.name}</p>
                <p className="text-xs text-neutral-500">{ad.platform} · {ad.placement}{ad.launchedAt ? ` · launched ${ad.launchedAt}` : ""}{ad.pausedAt ? ` · paused ${ad.pausedAt}` : ""}</p>
              </div>
              <Tags ad={ad} />
              <StatusSelect ad={ad} onChange={(s) => update(ad, s)} />
            </li>
          ))}
        </ul>
      )}

      {view === "list" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs text-neutral-500"><tr><th className="py-2 pr-3">Creative</th><th className="pr-3">Name</th><th className="pr-3">Platform</th><th className="pr-3">Launched</th><th className="pr-3">Tags</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((ad) => (
                <tr key={ad.id} className="border-b align-middle">
                  <td className="py-2 pr-3"><Thumb ad={ad} max={48} /></td>
                  <td className="pr-3 font-medium">{ad.name}</td>
                  <td className="pr-3">{ad.platform}<span className="block text-xs text-neutral-500">{ad.placement}</span></td>
                  <td className="pr-3">{ad.launchedAt ?? "—"}{ad.pausedAt && <span className="block text-xs text-amber-800">paused {ad.pausedAt}</span>}</td>
                  <td className="pr-3"><Tags ad={ad} /></td>
                  <td><StatusSelect ad={ad} onChange={(s) => update(ad, s)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
