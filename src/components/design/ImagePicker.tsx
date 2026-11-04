"use client";

import { useRef, useState } from "react";
import { Check, ShieldCheck, Upload } from "lucide-react";
import type { ImageRef } from "@/lib/composition/types";
import { assetUrl, PHOTOS, PRODUCTS } from "@/lib/imagery/library";

const MAX_BYTES = 8 * 1024 * 1024;

function readFile(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(f);
  });
}

function measure(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => res(null);
    im.src = src;
  });
}

/** Choose from the approved library or upload a file. Uploads are flagged as unapproved by the QA checks. */
export function ImagePicker({ kind, value, onPick }: { kind: "photo" | "product"; value?: ImageRef; onPick: (r: ImageRef) => void }) {
  const [tab, setTab] = useState<"library" | "upload">(value?.source === "upload" ? "upload" : "library");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pool = kind === "photo" ? PHOTOS : PRODUCTS;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return setError("Use a PNG, JPG or WebP file.");
    if (f.size > MAX_BYTES) return setError("That file is over 8 MB. Export a smaller version.");
    try {
      const src = await readFile(f);
      const dims = await measure(src);
      if (!dims) return setError("That file couldn't be read as an image.");
      onPick({ source: "upload", name: f.name, naturalW: dims.w, naturalH: dims.h, src });
    } catch {
      setError("That file couldn't be read.");
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Image source" className="inline-flex gap-1 rounded-lg bg-brand-neutral-150 p-1">
        {(["library", "upload"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-xs font-medium ${tab === t ? "bg-white text-brand-neutral-900 shadow-xs" : "text-brand-neutral-650"}`}>{t === "library" ? "Approved library" : "Upload"}</button>
        ))}
      </div>

      {tab === "library" ? (
        <ul className="grid grid-cols-3 gap-2" aria-label={`Approved ${kind === "photo" ? "photos" : "product images"}`}>
          {pool.map((a) => {
            const on = value?.source === "gallery" && value.id === a.id;
            return (
              <li key={a.id}>
                <button type="button" aria-pressed={on} onClick={() => onPick({ source: "gallery", id: a.id })} title={`${a.name} · ${a.license}`} className={`group relative block w-full overflow-hidden rounded-lg border bg-brand-neutral-100 p-1 ${on ? "border-brand-green-600 ring-2 ring-brand-green-600/30" : "border-brand-neutral-200 hover:border-brand-neutral-300"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(a.id)} alt={a.name} loading="lazy" className="aspect-square w-full rounded object-contain" />
                  {on && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-brand-green-600 text-white"><Check className="size-3" aria-hidden /></span>}
                  <span className="mt-1 block truncate text-left text-[11px] text-brand-neutral-750">{a.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id={`upload-${kind}`} onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor={`upload-${kind}`} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-brand-neutral-300 px-3 py-6 text-sm font-medium text-brand-neutral-800 hover:bg-brand-neutral-50 focus-within:outline-2 focus-within:outline-brand-periwinkle-500"><Upload className="size-4" aria-hidden />Choose a PNG, JPG or WebP</label>
          {value?.source === "upload" && <p className="text-xs text-brand-neutral-750">Using <strong className="font-medium">{value.name}</strong> ({value.naturalW}×{value.naturalH}px).</p>}
          <p className="text-xs text-brand-neutral-650">{kind === "product" ? "Product images work best as transparent PNGs. " : ""}Uploads aren&apos;t pre-approved and need brand review before launch. In this demo, uploads show only in the editor; generated ads use a placeholder until image storage is connected.</p>
          {error && <p role="alert" className="text-xs text-brand-red-500">{error}</p>}
        </div>
      )}
      {tab === "library" && <p className="flex items-center gap-1.5 text-[11px] text-brand-neutral-650"><ShieldCheck className="size-3.5 text-brand-green-600" aria-hidden />Pre-approved and licensed for paid use.</p>}
    </div>
  );
}
