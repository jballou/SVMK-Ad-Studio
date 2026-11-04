"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { deleteAssetAction, setAssetApprovedAction } from "@/app/actions";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import type { AssetDto } from "@/lib/assets/types";
import { fmtDate } from "@/lib/format";

export function AssetManager({ assets }: { assets: AssetDto[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const approve = (a: AssetDto) => start(async () => { setError(""); const r = await setAssetApprovedAction(a.id, !a.approved); if (!r.ok) setError("Couldn't update that image."); router.refresh(); });
  const remove = (a: AssetDto) => start(async () => { setError(""); const r = await deleteAssetAction(a.id); setConfirm(null); if (!r.ok) setError("Couldn't delete that image."); router.refresh(); });

  if (assets.length === 0) return <p className="rounded-xl border border-dashed border-brand-neutral-250 p-8 text-center text-sm text-brand-neutral-650">No uploaded or imported images yet. Add one from the design editor in a new batch.</p>;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-700">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 rounded-xl border border-brand-neutral-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt={a.name} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-brand-neutral-100 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={a.name}>{a.name}</p>
              <p className="text-xs capitalize text-brand-neutral-650">{a.kind} · {a.origin} · {a.width}×{a.height} · {fmtDate(a.createdAt)}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              {a.approved ? <Chip variant="completed" icon={ShieldCheck} chevron={false} className="!px-2.5 !py-1 !text-xs">Approved</Chip> : <Chip variant="pending" chevron={false} className="!px-2.5 !py-1 !text-xs">Needs review</Chip>}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => approve(a)}>{a.approved ? "Revoke" : "Approve"}</Button>
                {confirm === a.id ? (
                  <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(a)}>Delete</Button>
                ) : (
                  <Button size="sm" variant="ghost" mode="icon" disabled={pending} aria-label={`Delete ${a.name}`} onClick={() => setConfirm(a.id)}><Trash2 /></Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
