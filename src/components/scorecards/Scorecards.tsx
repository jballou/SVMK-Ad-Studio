"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CircleCheck, CircleX, Upload } from "lucide-react";
import { importMetrics as importMetricsAction, saveManualChecks } from "@/app/actions";
import { AdArt } from "@/components/ads/AdArt";
import { BandChip, PlatformBadge, StatusChip, TooEarlyChip } from "@/components/ads/badges";
import { Button } from "@/components/ui/button-1";
import { Card, EmptyState, Stat } from "@/components/ui/primitives";
import type { AdRecord } from "@/lib/ads/types";
import { importMetrics, type Totals } from "@/lib/metrics/csv";
import { buildScorecard, daysLive, type Benchmark, type ManualChecks, type ManualCriterion, type Scorecard } from "@/lib/scorecard/build";
import { BAND_LABEL, MAX_POINTS, type Band, type Criterion, type LearningGate } from "@/lib/scorecard/score";

const CRITERIA: { key: Criterion; label: string; manual?: boolean }[] = [
  { key: "campaignActive", label: "Part of an active campaign", manual: true },
  { key: "landingPageClear", label: "Landing page messaging is clear", manual: true },
  { key: "ctaMatch", label: "CTA matches landing page", manual: true },
  { key: "icpMatch", label: "Messaging is ICP-specific and targeting matches", manual: true },
  { key: "underNinetyDays", label: "In market under 90 days" },
  { key: "primaryMetrics", label: "Primary metrics beat benchmarks" },
  { key: "secondaryMetrics", label: "Secondary metrics beat benchmarks" },
  { key: "topPerformer", label: "Top performer in its group" },
];

const BANDS: Band[] = ["keep-scale", "monitor-optimize", "optimize-test", "refresh-pause"];
const markLabel = (v: boolean | null) => (v === null ? "not applicable" : v ? "met" : "not met");
const PAGE = 12;
const sel = "h-9 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm";

function Mark({ result }: { result: boolean | null }) {
  if (result === null) return <span aria-hidden>—</span>;
  const Icon = result ? CircleCheck : CircleX;
  return <Icon aria-hidden className={`size-4 shrink-0 ${result ? "text-brand-green-600" : "text-brand-red-500"}`} />;
}

export function Scorecards({ ads, benchmarks, totals, checks, today, gate, period }: { ads: AdRecord[]; benchmarks: Benchmark[]; totals: Record<string, Totals>; checks: Record<string, ManualChecks>; today: string; gate: LearningGate; period: string }) {
  const router = useRouter();
  const [manual, setManual] = useState<Record<string, ManualChecks>>(checks);
  const [msg, setMsg] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("live");
  const [band, setBand] = useState("");
  const [sort, setSort] = useState("score-asc");
  const [limit, setLimit] = useState(PAGE);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = importMetrics(await file.text());
    if (res.rows.length === 0) return setMsg(`Import failed: ${res.errors[0]?.message ?? "no rows found"}`);
    try {
      const saved = await importMetricsAction(res.rows);
      const bits = [`Saved ${saved.imported} rows`];
      if (res.errors.length) bits.push(`${res.errors.length} skipped (first: line ${res.errors[0].line}, ${res.errors[0].message})`);
      if (saved.unmatchedNames.length) bits.push(`${saved.unmatchedNames.length} unmatched ad names (e.g. ${saved.unmatchedNames[0]})`);
      setMsg(bits.join("; "));
      router.refresh();
    } catch {
      setMsg("Import failed on the server. Nothing was saved.");
    }
  };

  const toggle = async (name: string, k: ManualCriterion) => {
    const prev = manual[name] ?? {};
    const next = { ...prev, [k]: !prev[k] };
    setManual((m) => ({ ...m, [name]: next }));
    try {
      const res = await saveManualChecks({ name, checks: next });
      if (!res.ok) throw new Error("not found");
    } catch {
      setManual((m) => ({ ...m, [name]: prev }));
      setMsg(`Couldn't save the check for ${name}. Try again.`);
    }
  };

  const cards = useMemo(() => {
    const launched = ads.filter((a) => a.status !== "draft");
    const groups = new Map<string, AdRecord[]>();
    for (const a of launched) groups.set(`${a.platform}|${a.tags.funnel}`, [...(groups.get(`${a.platform}|${a.tags.funnel}`) ?? []), a]);
    return launched.map((ad) => {
      const peers = (groups.get(`${ad.platform}|${ad.tags.funnel}`) ?? []).filter((p) => p.id !== ad.id).map((p) => ({ ad: p, totals: totals[p.name] }));
      return { ad, card: buildScorecard({ ad, totals: totals[ad.name], benchmarks, manual: manual[ad.name] ?? {}, peers, today, gate }) as Scorecard };
    });
  }, [ads, totals, manual, benchmarks, today, gate]);

  const inScope = cards.filter((c) => (!platform || c.ad.platform === platform) && (!status || c.ad.status === status));
  const counts = new Map<string, number>();
  for (const c of inScope) {
    const k = c.card.state === "scored" ? c.card.score.band : "too-early";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const shown = inScope
    .filter((c) => !band || (band === "too-early" ? c.card.state === "too-early" : c.card.state === "scored" && c.card.score.band === band))
    .sort((a, b) => {
      const sa = a.card.state === "scored" ? a.card.score.percent : 101;
      const sb = b.card.state === "scored" ? b.card.score.percent : 101;
      if (sort === "name") return a.ad.name.localeCompare(b.ad.name);
      return (sort === "score-asc" ? sa - sb : sb - sa) || a.ad.name.localeCompare(b.ad.name);
    });
  const visible = shown.slice(0, limit);
  const reset = () => setLimit(PAGE);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {BANDS.map((b) => (
          <button key={b} type="button" onClick={() => { setBand(band === b ? "" : b); reset(); }} aria-pressed={band === b} className={`rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500 ${band === b ? "ring-2 ring-brand-green-600" : ""}`}>
            <Stat label={BAND_LABEL[b]} value={String(counts.get(b) ?? 0)} sub={{ "keep-scale": "90–100%", "monitor-optimize": "70–89%", "optimize-test": "50–69%", "refresh-pause": "below 50%" }[b]} />
          </button>
        ))}
        <button type="button" onClick={() => { setBand(band === "too-early" ? "" : "too-early"); reset(); }} aria-pressed={band === "too-early"} className={`rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500 ${band === "too-early" ? "ring-2 ring-brand-green-600" : ""}`}>
          <Stat label="Too early" value={String(counts.get("too-early") ?? 0)} sub={`under ${gate.minDays} days or ${gate.minImpressions.toLocaleString("en-US")} impr.`} />
        </button>
      </div>

      <Card title="Import performance (CSV)" description="Columns: Date, Ad Name, Spend, Impressions, Clicks, Conversions. Ad names must match Concept + MMYYYY _ WxH. Rows for an ad replace its sample numbers." actions={<Upload className="size-4 text-brand-neutral-550" aria-hidden />}>
        <input type="file" accept=".csv,text/csv" className="text-sm" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload performance CSV" />
        {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
      </Card>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-neutral-200 bg-white p-3">
        <label className="text-xs font-medium text-brand-neutral-650">Platform<select value={platform} onChange={(e) => { setPlatform(e.target.value); reset(); }} className={`${sel} mt-1 block`}><option value="">All</option>{["linkedin", "meta", "display", "newsletter"].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Status<select value={status} onChange={(e) => { setStatus(e.target.value); reset(); }} className={`${sel} mt-1 block capitalize`}><option value="">All</option>{["live", "paused", "retired"].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Band<select value={band} onChange={(e) => { setBand(e.target.value); reset(); }} className={`${sel} mt-1 block`}><option value="">All</option>{BANDS.map((b) => <option key={b} value={b}>{BAND_LABEL[b]}</option>)}<option value="too-early">Too early</option></select></label>
        <label className="text-xs font-medium text-brand-neutral-650">Sort<select value={sort} onChange={(e) => setSort(e.target.value)} className={`${sel} mt-1 block`}><option value="score-asc">Lowest score first</option><option value="score-desc">Highest score first</option><option value="name">Name</option></select></label>
        <p className="ml-auto text-sm text-brand-neutral-650" aria-live="polite">{shown.length} scorecards · {period}</p>
      </div>

      {shown.length === 0 && <EmptyState title="No scorecards match" body="Try a different platform, status or band." />}

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map(({ ad, card }) => (
          <article key={ad.id} className="space-y-3 rounded-xl border border-brand-neutral-200 bg-white p-4">
            <header className="flex items-start gap-3">
              <Link href={`/gallery/${ad.name}`} className="w-16 shrink-0 overflow-hidden rounded border border-brand-neutral-200" aria-label={`Open ${ad.name}`}><AdArt art={ad.art} copy={ad.copy} width={ad.width} height={ad.height} showCta={false} /></Link>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold"><Link href={`/gallery/${ad.name}`} className="hover:underline">{ad.name}</Link></h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><PlatformBadge platform={ad.platform} /><StatusChip status={ad.status} /><span className="text-xs text-brand-neutral-650">{ad.tags.funnel} · {daysLive(ad, today)} days live</span></p>
              </div>
              {card.state === "scored" ? <BandChip band={card.score.band} percent={card.score.percent} /> : <TooEarlyChip />}
            </header>
            {card.state === "too-early" && <p className="text-xs text-brand-neutral-650">Still in the learning phase ({card.daysLive}/{card.gate.minDays} days, {card.impressions.toLocaleString("en-US")}/{card.gate.minImpressions.toLocaleString("en-US")} impressions). The score is withheld until both are met.</p>}
            <ul className="space-y-1 text-sm">
              {CRITERIA.map((c) => {
                const result = card.state === "scored" ? card.criteria[c.key] : null;
                return (
                  <li key={c.key} className="flex items-center gap-2">
                    {c.manual ? (
                      <label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={!!manual[ad.name]?.[c.key as ManualCriterion]} onChange={() => toggle(ad.name, c.key as ManualCriterion)} className="accent-brand-green-600" /><span>{c.label}</span></label>
                    ) : <span className="flex-1 text-brand-neutral-800">{c.label}</span>}
                    {card.state === "scored" && (
                      <span className="flex w-20 items-center justify-end gap-1 text-xs tabular-nums text-brand-neutral-650"><Mark result={result} /><span className="sr-only">{markLabel(result)}</span>{result === null ? "" : `${result ? MAX_POINTS[c.key] : 0}/${MAX_POINTS[c.key]}`}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {card.state === "scored" && <p className="text-xs text-brand-neutral-550">{card.score.earned}/{card.score.possible} pts · — means no benchmark or peers, excluded from the total</p>}
          </article>
        ))}
      </div>
      {shown.length > visible.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Show more ({shown.length - visible.length} remaining)</Button></div>}
    </div>
  );
}
