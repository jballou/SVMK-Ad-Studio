"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { changeTemplateStatus, removeTemplate } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { Card, EmptyState } from "@/components/ui/primitives";
import { platformLabel } from "@/lib/specs/platforms";

export interface TemplateCard {
  id: number;
  name: string;
  description?: string;
  status: "draft" | "published";
  intent?: string;
  campaign?: string;
  funnels: string[];
  personas: string[];
  platforms: string[];
  sizes: string[];
  errors: number;
  warnings: number;
  thumb?: string;
  fromFigma: boolean;
  updatedAt?: string;
}

export function TemplateList({ templates }: { templates: TemplateCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toggle = (t: TemplateCard) => start(async () => { setError(""); await changeTemplateStatus(t.id, t.status === "published" ? "draft" : "published"); router.refresh(); });
  const remove = (t: TemplateCard) => start(async () => {
    setError("");
    const res = await removeTemplate(t.id);
    if (!res.ok) setError(res.error ?? "Couldn't delete it.");
    else router.refresh();
  });
  const mine = templates.filter((t) => t.fromFigma);
  const starters = templates.filter((t) => !t.fromFigma);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">Templates turn a Figma design into something anyone can edit within the designer&apos;s limits: character counts, locked logo, image fit and spacing. Link a design from Figma, confirm what was detected, and publish.</p>
        <Button asChild><Link href="/settings/templates/new"><Plus /> New template</Link></Button>
      </div>
      {error && <p role="alert" className="text-sm text-bad-fg">{error}</p>}

      <section aria-labelledby="mine" className="space-y-4">
        <h2 id="mine" className="text-base font-bold">From Figma</h2>
        {mine.length === 0 ? <EmptyState title="No templates from Figma yet" body="Paste a Figma link to make the first one." action={<Button asChild><Link href="/settings/templates/new"><Plus /> New template</Link></Button>} /> : (
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {mine.map((t) => (
              <li key={t.id}>
                <Card className="h-full" padded={false}>
                  <div className="flex gap-4 p-4">
                    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-clip rounded-tight border border-line bg-n-100">{t.thumb ? <img src={t.thumb} alt="" className="size-full object-contain" /> : <span className="text-xs text-muted">No preview</span>}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 truncate text-base font-bold">{t.name}</h3><Chip variant={t.status === "published" ? "completed" : "label"} chevron={false} className="!px-2 !py-0 !text-xs">{t.status === "published" ? "Published" : "Draft"}</Chip></div>
                      <p className="mt-0 text-xs text-muted">{[t.campaign, t.sizes.join(", ")].filter(Boolean).join(" · ")}</p>
                      <p className="mt-0 text-xs text-muted">{[t.funnels.join(", "), t.personas.join(", ")].filter(Boolean).join(" · ") || "No funnel or audience set"}</p>
                      <p className="mt-0 text-xs text-muted">{t.platforms.map(platformLabel).join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2">
                    <span className={`text-xs ${t.errors ? "text-bad-fg" : t.warnings ? "text-warn-fg" : "text-muted"}`}>{t.errors ? `${t.errors} error${t.errors === 1 ? "" : "s"}` : t.warnings ? `${t.warnings} warning${t.warnings === 1 ? "" : "s"}` : "No issues"}</span>
                    <span className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={pending || (t.status === "draft" && t.errors > 0)} onClick={() => toggle(t)}>{t.status === "published" ? "Unpublish" : "Publish"}</Button>
                      <Button variant="ghost" size="icon" disabled={pending} onClick={() => remove(t)} aria-label={`Delete ${t.name}`}><Trash2 /></Button>
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="starter" className="space-y-4">
        <h2 id="starter" className="text-base font-bold">Creative intents</h2>
        <p className="text-sm text-muted">The eight starter intents every template is filed under. They can&apos;t be deleted.</p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {starters.map((t) => <li key={t.id} className="card p-4"><p className="text-sm font-bold">{t.name}</p><p className="mt-0 text-xs text-muted">{t.description}</p></li>)}
        </ul>
      </section>
    </div>
  );
}
