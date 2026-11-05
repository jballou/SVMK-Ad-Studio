"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, FileSpreadsheet, Sparkles } from "lucide-react";
import { generateBatch, type BatchResult } from "@/app/actions";
import { DesignEditor, qaForDesign, type SizeOption } from "@/components/design/DesignEditor";
import { stripUploads } from "@/lib/composition/edit";
import type { Design } from "@/lib/composition/types";
import { counts } from "@/lib/composition/qa";
import { overusesGreen900, type LogoVariant } from "@/lib/composition/logo";
import { BatchCart } from "@/components/batches/BatchCart";
import { ConceptGallery } from "@/components/batches/ConceptGallery";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/primitives";
import { checkCopy, planBatch } from "@/lib/batches/plan";
import { conceptByKey, COPY_DECKS, DECK_LIMITS, designForConcept, type DeckRowData } from "@/lib/dummy/library";
import { fmtDate } from "@/lib/format";
import { PLACEMENTS, type PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_LABEL } from "@/lib/ui/colors";

const STEPS = ["Concepts", "Copy deck", "Platforms", "Preview", "Review"] as const;
type CopyEdit = Pick<DeckRowData, "platformHeadline" | "intro">;

const field = "h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";

export function BatchWizard({ existing, defaultMonth, customRequestUrl }: { existing: string[]; defaultMonth: string; customRequestUrl: string }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [deckOverride, setDeckOverride] = useState<string | null>(null);
  // Default to the copy deck that covers the most picked concepts; the user can change it.
  const deckId = deckOverride ?? [...COPY_DECKS].sort((a, b) => picked.filter((k) => b.rows.some((r) => r.adBase === k)).length - picked.filter((k) => a.rows.some((r) => r.adBase === k)).length)[0].id;
  const [edits, setEdits] = useState<Record<string, Partial<CopyEdit>>>({});
  const [placements, setPlacements] = useState<string[]>(["linkedin-single-image", "instagram-feed"]);
  const [previewConcept, setPreviewConcept] = useState<string>("");
  const [designs, setDesigns] = useState<Record<string, Design>>({});
  const [month, setMonth] = useState(defaultMonth);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<BatchResult | null>(null);

  const deck = COPY_DECKS.find((d) => d.id === deckId)!;
  const rowFor = (key: string): DeckRowData | undefined => {
    const base = deck.rows.find((r) => r.adBase === key);
    if (base) return { ...base, ...edits[key] };
    const c = conceptByKey(key);
    return c ? { adBase: key, funnel: c.funnel, headline: c.headline, platformHeadline: c.platformHeadline, intro: c.intro, cta: c.cta, landing: c.landing, ...edits[key] } : undefined;
  };
  const rows = picked.flatMap((k) => { const r = rowFor(k); return r ? [r] : []; });
  const checks = rows.map((r) => ({ row: r, issues: checkCopy(r, DECK_LIMITS) }));
  const copyErrors = checks.reduce((n, c) => n + c.issues.filter((i) => i.severity === "error").length, 0);
  const orphanRows = deck.rows.filter((r) => !conceptByKey(r.adBase));

  const [y, m] = month.split("-").map(Number);
  const plan = useMemo(() => planBatch({ conceptKeys: picked, placementKeys: placements, month: m || 1, year: y || 2026, existing: new Set(existing) }), [picked, placements, m, y, existing]);
  const fresh = plan.filter((p) => !p.exists);

  const pc = previewConcept && picked.includes(previewConcept) ? previewConcept : picked[0];
  const previewRow = pc ? rowFor(pc) : undefined;
  const sizes = useMemo<SizeOption[]>(() => {
    const seen = new Set<string>();
    const out: SizeOption[] = [];
    for (const k of placements) {
      const p = PLACEMENTS.find((x) => x.key === k);
      if (!p) continue;
      for (const sz of p.sizes) {
        const id = `${sz.w}x${sz.h}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ placementKey: p.key, width: sz.w, height: sz.h, label: p.label });
      }
    }
    return out;
  }, [placements]);
  const designFor = (key: string): Design => designs[key] ?? designForConcept(conceptByKey(key)!, rowFor(key)?.headline);
  const qa = useMemo(() => {
    const m = new Map<string, { errors: number; warnings: number }>();
    for (const k of picked) {
      const c = conceptByKey(k);
      if (!c) continue;
      const all = [...qaForDesign(c, designs[k] ?? designForConcept(c, rowFor(k)?.headline), sizes).values()].flat();
      m.set(k, counts(all));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, designs, sizes, edits, deckId]);
  const logoCounts = picked.reduce<Record<LogoVariant, number>>((acc, k) => { acc[designFor(k).content.logo ?? "green"]++; return acc; }, { green: 0, white: 0, "green-900": 0 });
  const green900Heavy = overusesGreen900(logoCounts);
  const designErrors = [...qa.values()].reduce((n, c) => n + c.errors, 0);
  const designWarnings = [...qa.values()].reduce((n, c) => n + c.warnings, 0);

  const canNext = step === 0 ? picked.length > 0 : step === 1 ? copyErrors === 0 : step === 2 ? placements.length > 0 : step === 3 ? designErrors === 0 : true;
  const reason = step === 0 ? "Select at least one concept." : step === 1 ? `Fix ${copyErrors} copy error${copyErrors === 1 ? "" : "s"} to continue.` : step === 2 ? "Select at least one placement." : step === 3 ? `Fix ${designErrors} design error${designErrors === 1 ? "" : "s"} to continue.` : "";

  const defaultName = picked.length === 1 ? picked[0] : `${picked.length} concepts`;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = () => {
    const batchName = name.trim() || defaultName;
    start(async () => {
      const copy = Object.fromEntries(rows.map((r) => [r.adBase, { headline: r.headline, platformHeadline: r.platformHeadline, intro: r.intro, cta: r.cta, landing: r.landing }]));
      try {
        const designPayload = Object.fromEntries(picked.map((k) => [k, stripUploads(designFor(k))]));
        setResult(await generateBatch({ name: batchName, month: m, year: y, conceptKeys: picked, placementKeys: placements, copy, designs: designPayload }));
      } catch {
        setResult({ ok: false, created: 0, skipped: [], names: [], error: "Something went wrong while generating. Nothing was saved." });
      }
    });
  };

  if (result?.ok) {
    return (
      <Card>
        <div className="mx-auto max-w-lg py-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-green-100 text-brand-green-600"><Check aria-hidden /></span>
          <h2 className="mt-4 text-xl font-semibold">Batch created</h2>
          <p className="mt-1 text-sm text-brand-neutral-650">{result.created} draft ad{result.created === 1 ? "" : "s"} added to the gallery{result.skipped.length > 0 && `, ${result.skipped.length} skipped because they already exist`}.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild><Link href={`/gallery?status=draft&q=${picked[0]}`}>View in gallery</Link></Button>
            <Button variant="outline" asChild><Link href={`/export?ads=${encodeURIComponent(result.names.slice(0, 60).join(","))}`}>Export batch</Link></Button>
            <Button variant="ghost" onClick={() => { setResult(null); setStep(0); setName(""); }}>Create another</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`grid gap-6 ${step === 3 ? "" : "lg:grid-cols-[minmax(0,1fr)_300px]"}`}>
      <div className="min-w-0 space-y-6">
        <ol className="flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed ${i === step ? "border-brand-green-600 bg-brand-green-100 text-brand-green-800" : i < step ? "border-brand-neutral-250 bg-white text-brand-neutral-800 hover:bg-brand-neutral-100" : "border-brand-neutral-200 bg-brand-neutral-100 text-brand-neutral-550"}`}>
                <span className={`grid size-5 place-items-center rounded-full text-[11px] ${i < step ? "bg-brand-green-600 text-white" : "bg-brand-neutral-200 text-brand-neutral-800"}`}>{i < step ? <Check className="size-3" aria-hidden /> : i + 1}</span>{s}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 && <ConceptGallery selected={picked} onToggle={(k) => setPicked(toggle(picked, k))} customRequestUrl={customRequestUrl} />}

        {step === 1 && (
          <Card title="Link the copy deck" description="Headline and intro text are checked against each platform's character limits." actions={<Chip variant="completed" chevron={false} className="!px-2.5 !py-1 !text-xs">Synced {fmtDate(deck.syncedAt)}</Chip>}>
            <label className="mb-4 block text-xs font-medium text-brand-neutral-650">Spreadsheet
              <select value={deckId} onChange={(e) => { setDeckOverride(e.target.value); setEdits({}); setDesigns({}); }} className={`${field} mt-1 max-w-md`}>
                {COPY_DECKS.map((d) => <option key={d.id} value={d.id}>{d.name} · tab “{d.tab}”</option>)}
              </select>
            </label>
            <p className="mb-3 flex items-center gap-2 text-xs text-brand-neutral-650"><FileSpreadsheet className="size-4" aria-hidden />Linked by {deck.linkedBy}. Edits below apply to this batch only; update the sheet to keep them.</p>
            <div className="space-y-3">
              {checks.map(({ row, issues }) => (
                <div key={row.adBase} className="rounded-xl border border-brand-neutral-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{row.adBase}</span>
                    {issues.length === 0 ? <span className="inline-flex items-center gap-1 text-xs text-brand-green-600"><CircleCheck className="size-4" aria-hidden />Ready</span> : <span className="flex flex-wrap gap-2">{issues.map((i) => <span key={i.message} className={`inline-flex items-center gap-1 text-xs ${i.severity === "error" ? "text-brand-red-500" : "text-brand-orange-600"}`}>{i.severity === "error" ? <CircleX className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}{i.message}</span>)}</span>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-brand-neutral-650">Headline <span className={`tabular-nums ${row.platformHeadline.length > DECK_LIMITS.platformHeadline ? "text-brand-red-500" : ""}`}>{row.platformHeadline.length}/{DECK_LIMITS.platformHeadline}</span>
                      <input value={row.platformHeadline} onChange={(e) => setEdits((s) => ({ ...s, [row.adBase]: { ...s[row.adBase], platformHeadline: e.target.value } }))} aria-invalid={row.platformHeadline.length > DECK_LIMITS.platformHeadline || !row.platformHeadline} className={`${field} mt-1`} />
                    </label>
                    <label className="text-xs font-medium text-brand-neutral-650">Intro text <span className={`tabular-nums ${row.intro.length > DECK_LIMITS.intro ? "text-brand-red-500" : ""}`}>{row.intro.length}/{DECK_LIMITS.intro}</span>
                      <textarea rows={2} value={row.intro} onChange={(e) => setEdits((s) => ({ ...s, [row.adBase]: { ...s[row.adBase], intro: e.target.value } }))} aria-invalid={row.intro.length > DECK_LIMITS.intro} className={`${field} mt-1 h-auto py-1.5`} />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-brand-neutral-650">In-image: “{row.headline}” · CTA: {row.cta || "—"} · {row.landing}</p>
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-brand-neutral-650">No concepts selected.</p>}
            </div>
            {orphanRows.length > 0 && (
              <div className="mt-4 rounded-lg bg-brand-yellow-100 p-3 text-sm text-brand-yellow-800">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" aria-hidden />{orphanRows.length} deck row{orphanRows.length === 1 ? " has" : "s have"} no matching Figma concept</p>
                <p className="mt-1 text-xs">{orphanRows.map((r) => r.adBase).join(", ")}. Rename the frame or the Ad Name so they match.</p>
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card title="Platforms and placements" description="Sizes and platform UI come from the spec table.">
            <div className="space-y-5">
              {(["linkedin", "meta", "display", "newsletter"] as PlatformKey[]).map((pf) => (
                <fieldset key={pf}>
                  <legend className="mb-2 text-sm font-semibold">{PLATFORM_LABEL[pf]}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PLACEMENTS.filter((p) => p.platform === pf).map((p) => (
                      <label key={p.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${placements.includes(p.key) ? "border-brand-green-600 bg-brand-green-100/40" : "border-brand-neutral-200 hover:bg-brand-neutral-50"}`}>
                        <input type="checkbox" checked={placements.includes(p.key)} onChange={() => setPlacements(toggle(placements, p.key))} className="mt-1 accent-brand-green-600" />
                        <span className="min-w-0 text-sm"><span className="block font-medium">{p.label}</span><span className="block text-xs text-brand-neutral-650">{p.sizes.map((s) => `${s.w}×${s.h}`).join(", ")}</span>{p.verifiedOn === null && <span className="mt-0.5 block text-[11px] text-brand-orange-600">Spec not yet verified</span>}{p.notes && <span className="block text-[11px] text-brand-neutral-650">{p.notes}</span>}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>
        )}

        {step === 3 && pc && previewRow && (
          <Card title="Preview and design" description="Edit each concept's imagery and text, then check it in the platform UI. Checks run for every size you selected." actions={
            <label className="flex items-center gap-2 text-xs font-medium text-brand-neutral-650">Concept
              <select value={pc} onChange={(e) => setPreviewConcept(e.target.value)} className="h-9 w-48 shrink-0 rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40">
                {picked.map((k) => { const n = qa.get(k); return <option key={k} value={k}>{k}{n?.errors ? ` (${n.errors} error${n.errors === 1 ? "" : "s"})` : n?.warnings ? ` (${n.warnings} warning${n.warnings === 1 ? "" : "s"})` : ""}</option>; })}
              </select>
            </label>
          }>
            <DesignEditor key={pc} concept={conceptByKey(pc)!} design={designFor(pc)} onChange={(d) => setDesigns((s) => ({ ...s, [pc]: d }))} sizes={sizes} platformCopy={{ intro: previewRow.intro, platformHeadline: previewRow.platformHeadline, landing: previewRow.landing }} />
          </Card>
        )}

        {step === 4 && (
          <Card title="Review and generate" description="Ads are created as drafts. Nothing goes to a platform from here.">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-brand-neutral-650">Batch name<input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} className={`${field} mt-1`} /></label>
              <label className="text-xs font-medium text-brand-neutral-650">Launch month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${field} mt-1`} /></label>
            </div>
            <div className="overflow-x-auto rounded-lg border border-brand-neutral-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Ads this batch will create</caption>
                <thead className="border-b border-brand-neutral-200 text-xs text-brand-neutral-650"><tr><th className="px-3 py-2 font-medium">Ad name</th><th className="px-3 font-medium">Platform</th><th className="px-3 font-medium">Size</th><th className="px-3 font-medium">Result</th></tr></thead>
                <tbody className="divide-y divide-brand-neutral-150">
                  {plan.map((p) => (
                    <tr key={p.name}><td className="px-3 py-1.5 font-medium">{p.name}</td><td className="px-3 text-brand-neutral-750">{PLATFORM_LABEL[p.platform]}</td><td className="px-3 tabular-nums text-brand-neutral-750">{p.width}×{p.height}</td><td className="px-3">{p.exists ? <span className="text-xs text-brand-orange-600">Already exists, skipped</span> : <span className="text-xs text-brand-green-600">New draft</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`mt-3 text-sm ${designErrors ? "text-brand-red-500" : designWarnings ? "text-brand-orange-600" : "text-brand-green-700"}`}>{designErrors ? `${designErrors} design error${designErrors === 1 ? "" : "s"} must be fixed in the Preview step.` : designWarnings ? `${designWarnings} design warning${designWarnings === 1 ? "" : "s"} across all sizes. You can generate, but review them first.` : "Creative checks passed for every size."}</p>
            {green900Heavy && <p className="mt-1 text-sm text-brand-orange-600">{logoCounts["green-900"]} of {picked.length} concepts use the Green 900 logo. It&apos;s meant for occasional use; switch most back to Green (or White on dark backgrounds).</p>}
            {result && !result.ok && <p role="alert" className="mt-3 rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-700">{result.error}</p>}
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}><ArrowLeft /> Back</Button>
          <div className="flex items-center gap-3">
            {!canNext && <span className="text-xs text-brand-neutral-650" role="status">{reason}</span>}
            {step < 4 ? <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight /></Button> : <Button onClick={submit} disabled={pending || fresh.length === 0 || designErrors > 0}><Sparkles /> {pending ? "Generating…" : `Generate ${fresh.length} ad${fresh.length === 1 ? "" : "s"}`}</Button>}
          </div>
        </div>
      </div>

      {step !== 3 && <BatchCart picked={picked} onRemove={(k) => setPicked(picked.filter((x) => x !== k))} onClear={() => setPicked([])} adsToCreate={fresh.length} alreadyExist={plan.length - fresh.length} placements={placements.length} copyErrors={copyErrors} step={step} />}
    </div>
  );
}
