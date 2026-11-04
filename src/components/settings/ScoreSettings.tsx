"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLearningGate } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Card } from "@/components/ui/primitives";
import { BAND_LABEL, MAX_POINTS, type Band, type LearningGate } from "@/lib/scorecard/score";

const field = "h-9 w-40 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";
const LABEL: Record<string, string> = { campaignActive: "Part of an active campaign", landingPageClear: "Landing page messaging is clear", ctaMatch: "CTA matches landing page", icpMatch: "Messaging is ICP-specific, targeting matches", underNinetyDays: "In market under 90 days", primaryMetrics: "Primary metrics beat benchmarks", secondaryMetrics: "Secondary metrics beat benchmarks", topPerformer: "Top performer in its group" };
const BANDS: [Band, string, string][] = [["keep-scale", "90–100%", "Keep running, consider scaling, and reuse the creative as a learning."], ["monitor-optimize", "70–89%", "Keep running while fixing gaps in messaging, targeting or landing page."], ["optimize-test", "50–69%", "Diagnose the lowest criteria, change one thing and test a revised version."], ["refresh-pause", "Below 50%", "Consider pausing or replacing it."]];

export function ScoreSettings({ gate }: { gate: LearningGate }) {
  const router = useRouter();
  const [days, setDays] = useState(String(gate.minDays));
  const [impr, setImpr] = useState(String(gate.minImpressions));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveLearningGate({ minDays: Number(days), minImpressions: Number(impr) });
      setMsg(res.ok ? "Saved. Scorecards use the new gate now." : "Enter whole numbers (1–90 days, at least 100 impressions).");
      if (res.ok) router.refresh();
    });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Learning phase" description="Ads below either threshold show “Too early” and are not scored.">
        <form onSubmit={save} className="space-y-4">
          <label className="block text-xs font-medium text-brand-neutral-650">Minimum days live<input type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} className={`${field} mt-1 block`} /></label>
          <label className="block text-xs font-medium text-brand-neutral-650">Minimum impressions<input type="number" min={100} step={100} value={impr} onChange={(e) => setImpr(e.target.value)} className={`${field} mt-1 block`} /></label>
          <Button type="submit" disabled={pending}>Save</Button>
          {msg && <p role="status" className="text-sm text-brand-neutral-750">{msg}</p>}
        </form>
      </Card>
      <Card title="Scoring" description="Fixed rules shared with the Q3 scorecard deck">
        <ul className="space-y-1.5 text-sm">{Object.entries(MAX_POINTS).map(([k, v]) => <li key={k} className="flex justify-between gap-3"><span>{LABEL[k]}</span><span className="tabular-nums text-brand-neutral-650">{v} pts</span></li>)}</ul>
        <p className="mt-3 text-xs text-brand-neutral-650">Criteria with no benchmark or peers are marked “—” and dropped from the total.</p>
        <dl className="mt-4 space-y-2 border-t border-brand-neutral-150 pt-4 text-sm">{BANDS.map(([b, r, d]) => <div key={b}><dt className="font-medium">{BAND_LABEL[b]} <span className="font-normal text-brand-neutral-650">· {r}</span></dt><dd className="text-xs text-brand-neutral-650">{d}</dd></div>)}</dl>
      </Card>
    </div>
  );
}
