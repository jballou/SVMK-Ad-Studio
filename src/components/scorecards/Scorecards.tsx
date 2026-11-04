"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { importMetrics as importMetricsAction, saveManualChecks } from "@/app/actions";
import type { AdRecord } from "@/lib/ads/types";
import { importMetrics, type Totals } from "@/lib/metrics/csv";
import { buildScorecard, daysLive, type Benchmark, type ManualChecks, type ManualCriterion } from "@/lib/scorecard/build";
import { BAND_LABEL, MAX_POINTS, type Band, type Criterion } from "@/lib/scorecard/score";

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

const BAND_STYLE: Record<Band, string> = {
  "keep-scale": "bg-emerald-100 text-emerald-900",
  "monitor-optimize": "bg-sky-100 text-sky-900",
  "optimize-test": "bg-amber-100 text-amber-900",
  "refresh-pause": "bg-red-100 text-red-900",
};

function Mark({ result }: { result: boolean | null }) {
  if (result === null) return <span aria-hidden>—</span>;
  const Icon = result ? CircleCheck : CircleX;
  return <Icon aria-hidden className={`size-4 shrink-0 ${result ? "text-brand-green-600" : "text-brand-red-500"}`} />;
}
const markLabel = (v: boolean | null) => (v === null ? "not applicable" : v ? "met" : "not met");

export function Scorecards({ ads, benchmarks, totals, checks, today }: { ads: AdRecord[]; benchmarks: Benchmark[]; totals: Record<string, Totals>; checks: Record<string, ManualChecks>; today: string }) {
  const router = useRouter();
  const [manual, setManual] = useState<Record<string, ManualChecks>>(checks);
  const [importMsg, setImportMsg] = useState<string>("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = importMetrics(await file.text());
    if (res.rows.length === 0) return setImportMsg(`Import failed: ${res.errors[0]?.message ?? "no rows found"}`);
    try {
      const saved = await importMetricsAction(res.rows);
      const bits = [`Saved ${saved.imported} rows`];
      if (res.errors.length) bits.push(`${res.errors.length} skipped (first: line ${res.errors[0].line}, ${res.errors[0].message})`);
      if (saved.unmatchedNames.length) bits.push(`${saved.unmatchedNames.length} unmatched ad names (e.g. ${saved.unmatchedNames[0]})`);
      setImportMsg(bits.join("; "));
      router.refresh();
    } catch {
      setImportMsg("Import failed on the server. Nothing was saved.");
    }
  };

  const cards = useMemo(() => {
    const live = ads.filter((a) => a.status !== "draft");
    return live.map((ad) => {
      const peers = live.filter((p) => p.id !== ad.id && p.platform === ad.platform && p.tags.funnel === ad.tags.funnel).map((p) => ({ ad: p, totals: totals[p.name] }));
      return { ad, card: buildScorecard({ ad, totals: totals[ad.name], benchmarks, manual: manual[ad.id] ?? {}, peers, today }) };
    });
  }, [ads, totals, manual, benchmarks, today]);

  const platforms = [...new Set(cards.map((c) => c.ad.platform))];
  const toggle = async (id: string, k: ManualCriterion) => {
    const prev = manual[id] ?? {};
    const next = { ...prev, [k]: !prev[k] };
    setManual((m) => ({ ...m, [id]: next }));
    try {
      const res = await saveManualChecks({ name: id, checks: next });
      if (!res.ok) throw new Error("not found");
    } catch {
      setManual((m) => ({ ...m, [id]: prev }));
      setImportMsg(`Couldn't save the check for ${id}. Try again.`);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Import performance (CSV)</h2>
        <p className="mt-1 text-xs text-neutral-600">Columns: Date, Ad Name, Spend, Impressions, Clicks, Conversions. Ad names must match the <code>Concept + MMYYYY _ WxH</code> format. Rows for an ad replace its sample numbers; the same ad and date is updated, not duplicated.</p>
        <input type="file" accept=".csv,text/csv" className="mt-2 text-sm" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload performance CSV" />
        {importMsg && <p className="mt-2 text-sm" role="status">{importMsg}</p>}
      </section>

      {platforms.map((p) => (
        <section key={p} className="space-y-3">
          <h2 className="text-lg font-semibold capitalize">{p}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {cards.filter((c) => c.ad.platform === p).map(({ ad, card }) => (
              <article key={ad.id} className="space-y-3 rounded-lg border border-neutral-200 p-4">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{ad.name}</h3>
                    <p className="text-xs text-neutral-500">{ad.tags.funnel} · {ad.status} · {daysLive(ad, today)} days live</p>
                  </div>
                  {card.state === "scored" ? (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BAND_STYLE[card.score.band]}`}>
                      {card.score.percent}% · {BAND_LABEL[card.score.band]}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-800">Too early</span>
                  )}
                </header>

                {card.state === "too-early" && (
                  <p className="text-xs text-neutral-600">Still in the learning phase ({card.daysLive}/{card.gate.minDays} days, {card.impressions.toLocaleString()}/{card.gate.minImpressions.toLocaleString()} impressions). Score is withheld until both are met.</p>
                )}

                <ul className="space-y-1 text-sm">
                  {CRITERIA.map((c) => {
                    const result = card.state === "scored" ? card.criteria[c.key] : null;
                    return (
                      <li key={c.key} className="flex items-center gap-2">
                        {c.manual ? (
                          <label className="flex flex-1 items-center gap-2">
                            <input type="checkbox" checked={!!manual[ad.id]?.[c.key as ManualCriterion]} onChange={() => toggle(ad.id, c.key as ManualCriterion)} />
                            <span>{c.label}</span>
                          </label>
                        ) : (
                          <span className="flex-1 text-neutral-800">{c.label}</span>
                        )}
                        {card.state === "scored" && (
                          <span className="flex w-20 items-center justify-end gap-1 text-xs tabular-nums text-neutral-600">
                            <Mark result={result} />
                            <span className="sr-only">{markLabel(result)}</span>
                            {result === null ? "" : `${result ? MAX_POINTS[c.key] : 0}/${MAX_POINTS[c.key]}`}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {card.state === "scored" && <p className="text-xs text-neutral-500">{card.score.earned}/{card.score.possible} pts · — means no benchmark or peers, excluded from the total</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
