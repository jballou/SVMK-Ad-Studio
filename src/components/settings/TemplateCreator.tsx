"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CircleX, Info, Link2, Trash2 } from "lucide-react";
import { previewTemplate, publishTemplate } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { PageFooter } from "@/components/ui/page-footer";
import { Card } from "@/components/ui/primitives";
import { checkFrame } from "@/lib/templates/extract";
import { STARTER_TEMPLATES } from "@/lib/templates/intents";
import type { ElementRole, ElementSpec, FrameSpec, TemplateSpec } from "@/lib/templates/spec";
import type { Taxonomy } from "@/lib/settings";
import { allPlacements, platformLabel } from "@/lib/specs/platforms";
import { platformKeys } from "@/lib/specs/platforms";

const STEPS = ["Figma link", "Details", "Confirm specs"] as const;
const field = "h-10 w-full rounded-tight border border-control bg-card px-4 text-sm text-ink";
const ROLES: ElementRole[] = ["headline", "subhead", "stat", "body", "cta", "logo", "partner-logos", "image", "background-image", "product", "decoration"];
const ROLE_LABEL: Record<ElementRole, string> = {
  headline: "Headline", subhead: "Subhead", stat: "Stat", body: "Body text", cta: "CTA button", logo: "Brand logo", "partner-logos": "Partner logos",
  image: "Image", "background-image": "Background image", product: "Product", decoration: "Decoration",
};
const ROLE_COLOR: Partial<Record<ElementRole, string>> = {
  headline: "#08794A", subhead: "#348289", stat: "#A95C18", body: "#686764", cta: "#AE453F", logo: "#5568BF", "partner-logos": "#7068EB", image: "#CEA40D", "background-image": "#99A532", product: "#6F5BB5",
};

function MultiChips({ label, hint, options, value, onChange, format = (v) => v }: { label: string; hint?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; format?: (v: string) => string }) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-muted">{label}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return <button key={o} type="button" aria-pressed={on} data-on={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className="chip">{format(o)}</button>;
        })}
        {options.length === 0 && <span className="text-xs text-muted">None set up yet</span>}
      </div>
    </fieldset>
  );
}

const SevIcon = ({ s }: { s: "error" | "warn" | "info" }) => (s === "error" ? <CircleX className="size-4 shrink-0 text-bad-fg" aria-hidden /> : s === "warn" ? <AlertTriangle className="size-4 shrink-0 text-warn-fg" aria-hidden /> : <Info className="size-4 shrink-0 text-muted" aria-hidden />);

export function TemplateCreator({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [spec, setSpec] = useState<TemplateSpec | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [frameId, setFrameId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [intent, setIntent] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [campaign, setCampaign] = useState("");
  const [description, setDescription] = useState("");
  const [funnels, setFunnels] = useState<string[]>([]);
  const [personas, setPersonas] = useState<string[]>([]);
  const [icps, setIcps] = useState<string[]>([]);
  const [geos, setGeos] = useState<string[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);

  const intentName = STARTER_TEMPLATES.find((t) => t.slug === intent)?.name ?? "";
  const autoName = [intentName, campaign.trim()].filter(Boolean).join(" · ");
  const shownName = nameTouched ? name : autoName;

  const read = () => start(async () => {
    setError("");
    const res = await previewTemplate(url);
    if (!res.ok) { setError(res.error); return; }
    const { spec: s, previews: p } = res.data;
    if (!s.frames.length) { setError(s.issues[0]?.message ?? "No ad frames found in that link."); return; }
    setSpec(s); setPreviews(p); setFrameId(s.frames[0].nodeId); setSelected(null);
    const suggested = [...new Set(s.frames.flatMap((f) => f.placements).map((k) => allPlacements().find((x) => x.key === k)?.platform).filter((x): x is string => !!x))];
    setPlatforms(suggested);
    setStep(1);
  });

  const frame = spec?.frames.find((f) => f.nodeId === frameId);
  const patchFrame = (id: string, fn: (f: FrameSpec) => FrameSpec) => setSpec((s) => s && { ...s, frames: s.frames.map((f) => (f.nodeId === id ? withIssues(fn(f)) : f)) });
  const withIssues = (f: FrameSpec): FrameSpec => ({ ...f, issues: checkFrame(f) });
  const patchEl = (id: string, fn: (e: ElementSpec) => ElementSpec) => frame && patchFrame(frame.nodeId, (f) => ({ ...f, elements: f.elements.map((e) => (e.id === id ? fn(e) : e)) }));
  const limits = useMemo(() => {
    const out: Partial<Record<ElementRole, number>> = {};
    for (const f of spec?.frames ?? []) for (const e of f.elements) if (e.text) out[e.role] = Math.min(out[e.role] ?? Infinity, e.text.maxChars);
    return out;
  }, [spec]);
  const errors = (spec?.frames ?? []).flatMap((f) => f.issues.filter((i) => i.severity === "error").map((i) => ({ ...i, size: `${f.width}×${f.height}` })));

  const canNext = step === 0 ? false : step === 1 ? !!intent && shownName.trim().length >= 2 : false;
  const reason = step === 1 ? (!intent ? "Pick a creative intent." : shownName.trim().length < 2 ? "Give the template a name." : "") : "";

  const save = (status: "draft" | "published") => start(async () => {
    if (!spec) return;
    setError("");
    const res = await publishTemplate({ name: shownName.trim(), description: description.trim() || undefined, status, intent, campaign: campaign.trim() || undefined, funnels, personas, icps, geos, offers, platforms, figmaUrl: url, spec: { ...spec, limits } });
    if (!res.ok) { setError(res.error); return; }
    router.push("/settings/templates");
  });

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={`chip ${i === step ? "!border-brand !bg-brand-soft" : ""} ${i > step ? "!text-muted" : ""}`}><span className="tabular-nums">{i + 1}</span> {s}</li>)}
      </ol>

      {step === 0 && (
        <Card title="Link the template from Figma" description="Select the frame, section or page that holds the sizes in Figma, then copy its link.">
          <form onSubmit={(e) => { e.preventDefault(); read(); }} className="space-y-4">
            <label className="block text-xs font-medium text-muted">Figma link
              <span className="relative mt-0 block">
                <Link2 aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/design/…?node-id=…" className={`${field} pl-10`} autoFocus />
              </span>
            </label>
            <ul className="list-disc space-y-2 pl-4 text-sm text-muted">
              <li>Name frames like <code>Concept_1200x1200</code> so each size is found. A link straight to one frame also works.</li>
              <li>Name layers <code>#headline</code>, <code>#subhead</code>, <code>#cta[20]</code>, <code>#hero</code> or <code>#logo</code> when you can. Unnamed layers are worked out from their size and position, and you confirm them next.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" disabled={pending || !url.trim()}>{pending ? "Reading Figma…" : "Read template"}</Button>
              {error && <span role="alert" className="text-sm text-bad-fg">{error}</span>}
            </div>
          </form>
        </Card>
      )}

      {step === 1 && spec && (
        <Card title="Template details" description={`${spec.frames.length} size${spec.frames.length === 1 ? "" : "s"} found: ${spec.frames.map((f) => `${f.width}×${f.height}`).join(", ")}`}>
          <div className="grid gap-6 lg:grid-cols-2">
            <label className="text-xs font-medium text-muted">Creative intent
              <select value={intent} onChange={(e) => setIntent(e.target.value)} className={`${field} mt-0`}>
                <option value="">Choose what the ad is for…</option>
                {STARTER_TEMPLATES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
              {intent && <span className="mt-0 block font-normal">{STARTER_TEMPLATES.find((t) => t.slug === intent)?.description}</span>}
            </label>
            <label className="text-xs font-medium text-muted">Campaign <span className="font-normal">(optional)</span>
              <input value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={80} placeholder="e.g. Curiosity, Phase 2" className={`${field} mt-0`} />
            </label>
            <label className="text-xs font-medium text-muted lg:col-span-2">Template name
              <input value={shownName} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} maxLength={80} className={`${field} mt-0`} placeholder="Defaults to the intent and campaign" />
            </label>
            <MultiChips label="Funnel stages" hint="Every stage this template suits." options={taxonomy.funnels} value={funnels} onChange={setFunnels} />
            <MultiChips label="Target audience" hint="Personas it speaks to." options={taxonomy.personas} value={personas} onChange={setPersonas} />
            <MultiChips label="ICP segments" options={taxonomy.icps} value={icps} onChange={setIcps} />
            <MultiChips label="Geos" options={taxonomy.geos} value={geos} onChange={setGeos} />
            <MultiChips label="Offers" options={taxonomy.offers} value={offers} onChange={setOffers} />
            <MultiChips label="Platforms" hint="Suggested from the sizes in the file." options={platformKeys()} value={platforms} onChange={setPlatforms} format={platformLabel} />
            <label className="text-xs font-medium text-muted lg:col-span-2">When to use it <span className="font-normal">(optional)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3} className="mt-0 w-full rounded-tight border border-control bg-card px-4 py-2 text-sm text-ink" placeholder="One or two sentences for the people choosing it." />
            </label>
          </div>
        </Card>
      )}

      {step === 2 && spec && frame && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card title="Preview" description="Click a box to edit that element. Boxes show what was detected." actions={
              <div role="group" aria-label="Size" className="seg">{spec.frames.map((f) => <button key={f.nodeId} type="button" aria-pressed={f.nodeId === frameId} onClick={() => { setFrameId(f.nodeId); setSelected(null); }} className="seg-item">{f.width}×{f.height}</button>)}</div>
            }>
              <div className="mx-auto max-w-lg">
                <div className="relative w-full overflow-clip rounded-tight border border-line bg-n-100" style={{ aspectRatio: `${frame.width} / ${frame.height}` }}>
                  {previews[frame.nodeId] && <img src={previews[frame.nodeId]} alt={`Figma render of ${frame.name}`} className="absolute inset-0 size-full object-contain" />}
                  {frame.elements.filter((e) => e.role !== "decoration" && e.role !== "background-image").map((e) => (
                    <button key={e.id} type="button" onClick={() => setSelected(e.id)} aria-label={`${ROLE_LABEL[e.role]}: ${e.name}`} aria-pressed={selected === e.id}
                      className="absolute border-2 text-left focus-visible:outline-2" style={{ left: `${e.box.x * 100}%`, top: `${e.box.y * 100}%`, width: `${e.box.w * 100}%`, height: `${e.box.h * 100}%`, borderColor: ROLE_COLOR[e.role] ?? "#686764", background: selected === e.id ? `${ROLE_COLOR[e.role] ?? "#686764"}33` : "transparent" }}>
                      <span className="absolute -top-px left-0 max-w-full truncate px-2 text-xs font-bold text-white" style={{ background: ROLE_COLOR[e.role] ?? "#686764" }}>{ROLE_LABEL[e.role]}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Margins: top {Math.round(frame.layout.margins.top * frame.height)}px, sides {Math.round(Math.min(frame.layout.margins.left, frame.layout.margins.right) * frame.width)}px, bottom {Math.round(frame.layout.margins.bottom * frame.height)}px. {frame.layout.textGaps.length > 0 && `Gaps between text: ${frame.layout.textGaps.join(", ")}px.`} Background {frame.background.color ?? "none"}{frame.background.image ? " with an image" : ""}.</p>
              </div>
            </Card>

            <Card title="Elements" description="Back to front. Set what each is, what editors can change, and the character limits." padded={false}>
              <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto">
                {[...frame.elements].reverse().map((e) => {
                  const open = selected === e.id;
                  return (
                    <li key={e.id} className={open ? "bg-n-100" : ""}>
                      <button type="button" onClick={() => setSelected(open ? null : e.id)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm">
                        <span aria-hidden className="size-2 shrink-0 rounded-round" style={{ background: ROLE_COLOR[e.role] ?? "#908D89" }} />
                        <span className="min-w-0 flex-1 truncate"><span className="font-medium">{ROLE_LABEL[e.role]}</span> <span className="text-muted">{e.text ? `· ${e.text.chars} chars` : e.name}</span></span>
                        <span className="text-xs text-muted">{e.locked ? "Locked" : "Editable"}</span>
                      </button>
                      {open && (
                        <div className="space-y-4 px-4 pb-4">
                          <label className="block text-xs font-medium text-muted">What it is
                            <select value={e.role} onChange={(ev) => patchEl(e.id, (x) => ({ ...x, role: ev.target.value as ElementRole, source: "named" }))} className={`${field} mt-0`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                          </label>
                          {e.text && (
                            <label className="block text-xs font-medium text-muted">Character limit
                              <input type="number" min={1} max={2000} value={e.text.maxChars} onChange={(ev) => patchEl(e.id, (x) => ({ ...x, text: x.text && { ...x.text, maxChars: Math.max(1, Math.min(2000, Number(ev.target.value) || 1)) } }))} className={`${field} mt-0`} />
                              <span className="mt-0 block font-normal">Figma copy is {e.text.chars} characters at {e.text.font.size}px; about {e.text.capacity} fit the box.</span>
                            </label>
                          )}
                          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!e.locked} onChange={(ev) => patchEl(e.id, (x) => ({ ...x, locked: !ev.target.checked }))} className="mt-0 accent-brand-green-600" /><span>Editors can change it<span className="block text-xs text-muted">Turn off for things that must stay as designed, like the logo.</span></span></label>
                          <Button variant="outline" size="sm" onClick={() => { patchFrame(frame.nodeId, (f) => ({ ...f, elements: f.elements.filter((x) => x.id !== e.id) })); setSelected(null); }}><Trash2 /> Not part of the template</Button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {frame.elements.length === 0 && <li className="p-4 text-sm text-muted">Nothing detected in this size.</li>}
              </ul>
            </Card>
          </div>

          <Card title="Checks" description="Fix these in Figma and read the link again, or confirm them as they are.">
            {spec.frames.every((f) => f.issues.length === 0) ? <p className="text-sm text-muted">No problems found.</p> : (
              <ul className="space-y-2">
                {spec.frames.flatMap((f) => f.issues.map((i, n) => <li key={`${f.nodeId}${n}`} className="flex items-start gap-2 text-sm"><SevIcon s={i.severity} /><span><span className="font-medium">{f.width}×{f.height}</span> <span className="text-muted">{i.message}</span></span></li>))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">Limits applied to every size: {Object.entries(limits).map(([r, n]) => `${ROLE_LABEL[r as ElementRole]} ${n}`).join(" · ") || "no text elements"}.</p>
          </Card>
        </>
      )}

      <PageFooter>
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>Back</Button>
          <div className="flex min-w-0 items-center gap-4">
            {step === 1 && !canNext && <span className="truncate text-xs text-muted" role="status">{reason}</span>}
            {step === 2 && errors.length > 0 && <span className="truncate text-xs text-bad-fg" role="status">{errors.length} error{errors.length === 1 ? "" : "s"} to fix before publishing</span>}
            {error && step > 0 && <span role="alert" className="truncate text-xs text-bad-fg">{error}</span>}
            {step === 1 && <Button onClick={() => setStep(2)} disabled={!canNext}>Next: Confirm specs</Button>}
            {step === 2 && <>
              <Button variant="outline" disabled={pending} onClick={() => save("draft")}>Save as draft</Button>
              <Button disabled={pending || errors.length > 0} onClick={() => save("published")}>{pending ? "Saving…" : "Publish template"}</Button>
            </>}
          </div>
        </div>
      </PageFooter>
    </div>
  );
}

