"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Frame, FolderOpen, ImageIcon, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import type { AssetDto, Capabilities } from "@/lib/assets/types";
import type { ImageRef } from "@/lib/composition/types";
import { assetUrl, PHOTOS, PRODUCTS } from "@/lib/imagery/library";
import { Loading } from "@/components/ui/loading";
import { useHeldLoading } from "@/components/ui/use-held-loading";

type Tab = "library" | "mine" | "upload" | "drive" | "figma";
const TABS: { id: Tab; label: string }[] = [
  { id: "library", label: "Approved" },
  { id: "mine", label: "My images" },
  { id: "upload", label: "Upload" },
  { id: "drive", label: "Drive" },
  { id: "figma", label: "Figma" },
];

const toRef = (a: AssetDto): ImageRef => ({ source: "asset", id: a.id, name: a.name, naturalW: a.width, naturalH: a.height, approved: a.approved, origin: a.origin });
const inputCls = "h-9 w-full rounded-lg border border-brand-neutral-250 bg-white px-2.5 text-sm focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

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

function Setup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-brand-neutral-300 bg-brand-neutral-50 p-3 text-xs text-brand-neutral-750"><p className="mb-1 text-sm font-medium text-brand-neutral-900">{title}</p>{children}</div>;
}

/** Pick from the approved library, previously stored images, a new upload, Google Drive, or Figma. */
export function ImagePicker({ kind, value, onPick }: { kind: "photo" | "product"; value?: ImageRef; onPick: (r: ImageRef) => void }) {
  const [tab, setTab] = useState<Tab>(value && value.source !== "gallery" ? "mine" : "library");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [mine, setMine] = useState<AssetDto[] | null>(null);
  const mineLoad = useHeldLoading(mine === null);
  const capsLoad = useHeldLoading(caps === null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [drive, setDrive] = useState<{ type: "file"; file: { id: string; name: string; size?: number } } | { type: "folder"; name: string; files: { id: string; name: string; size?: number }[] } | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figma, setFigma] = useState<{ name: string; width: number; height: number; previewUrl?: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pool = kind === "photo" ? PHOTOS : PRODUCTS;
  const storage = caps?.storage ?? "none";

  useEffect(() => {
    let live = true;
    api<{ items: AssetDto[]; capabilities: Capabilities }>(`/api/assets?kind=${kind}`)
      .then((r) => { if (live) { setMine(r.items); setCaps(r.capabilities); } })
      .catch(() => { if (live) { setMine([]); setCaps({ storage: "none", drive: false, figma: false }); } });
    return () => { live = false; };
  }, [kind]);

  const picked = (a: AssetDto) => { setMine((m) => [a, ...(m ?? []).filter((x) => x.id !== a.id)]); onPick(toRef(a)); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); } };

  const upload = (f: File | undefined) => f && run(async () => {
    if (storage === "none") {
      // No storage connected: keep the image in this browser session only.
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) throw new Error("Use a PNG, JPG or WebP file.");
      if (f.size > 4 * 1024 * 1024) throw new Error("That file is over 4 MB. Export a smaller version.");
      const src = await readFile(f);
      const dims = await measure(src);
      if (!dims) throw new Error("That file couldn't be read as an image.");
      return onPick({ source: "upload", name: f.name, naturalW: dims.w, naturalH: dims.h, src });
    }
    const form = new FormData();
    form.set("file", f);
    form.set("kind", kind);
    picked((await api<{ asset: AssetDto }>("/api/assets", { method: "POST", body: form })).asset);
    if (input.current) input.current.value = "";
  });

  const importDrive = (id: string) => run(async () => {
    const r = await api<{ results: ({ ok: true; asset: AssetDto } | { ok: false; error: string })[] }>("/api/import/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", fileIds: [id], kind }) });
    const first = r.results[0];
    if (!first.ok) throw new Error(first.error);
    picked(first.asset);
  });

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Image source" className="flex flex-wrap gap-1 rounded-lg bg-brand-neutral-150 p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setError(""); }} className={`rounded-md px-2.5 py-1 text-xs font-medium ${tab === t.id ? "bg-white text-brand-neutral-900 shadow-xs" : "text-brand-neutral-650 hover:text-brand-neutral-900"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "library" && (
        <>
          <ul className="grid grid-cols-3 gap-2" aria-label={`Approved ${kind === "photo" ? "photos" : "product images"}`}>
            {pool.map((a) => {
              const on = value?.source === "gallery" && value.id === a.id;
              return (
                <li key={a.id}>
                  <button type="button" aria-pressed={on} onClick={() => onPick({ source: "gallery", id: a.id })} title={`${a.name} · ${a.license}`} className={`relative block w-full overflow-hidden rounded-lg border bg-brand-neutral-100 p-1 ${on ? "border-brand-green-600 ring-2 ring-brand-green-600/30" : "border-brand-neutral-200 hover:border-brand-neutral-300"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={assetUrl(a.id)} alt={a.name} loading="lazy" className="aspect-square w-full rounded object-contain" />
                    {on && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-brand-green-600 text-white"><Check className="size-3" aria-hidden /></span>}
                    <span className="mt-1 block truncate text-left text-[11px] text-brand-neutral-750">{a.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="flex items-center gap-1.5 text-[11px] text-brand-neutral-650"><ShieldCheck className="size-3.5 text-brand-green-600" aria-hidden />Pre-approved and licensed for paid use.</p>
        </>
      )}

      {tab === "mine" && (
        mine === null || mineLoad !== "idle" ? <Loading leaving={mineLoad === "leaving"} /> : mine.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-neutral-300 p-4 text-center text-xs text-brand-neutral-650">Nothing here yet. Upload an image, or import one from Drive or Figma, and it will be saved for reuse.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2" aria-label="Uploaded and imported images">
            {mine.map((a) => {
              const on = value?.source === "asset" && value.id === a.id;
              return (
                <li key={a.id}>
                  <button type="button" aria-pressed={on} onClick={() => onPick(toRef(a))} title={a.name} className={`relative block w-full overflow-hidden rounded-lg border bg-brand-neutral-100 p-1 ${on ? "border-brand-green-600 ring-2 ring-brand-green-600/30" : "border-brand-neutral-200 hover:border-brand-neutral-300"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.name} loading="lazy" className="aspect-square w-full rounded object-contain" />
                    {a.approved && <span title="Approved" className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-brand-green-600 text-white"><ShieldCheck className="size-3" aria-hidden /></span>}
                    <span className="mt-1 block truncate text-left text-[11px] text-brand-neutral-750">{a.name}</span>
                    <span className="block text-left text-[10px] capitalize text-brand-neutral-550">{a.origin} · {a.width}×{a.height}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}

      {tab === "upload" && (
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id={`upload-${kind}`} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          <label htmlFor={`upload-${kind}`} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-brand-neutral-300 px-3 py-6 text-sm font-medium text-brand-neutral-800 hover:bg-brand-neutral-50 focus-within:outline-2 focus-within:outline-brand-periwinkle-500"><Upload className="size-4" aria-hidden />{busy ? "Uploading…" : "Choose a PNG, JPG or WebP"}</label>
          <p className="text-xs text-brand-neutral-650">Up to 4 MB. {kind === "product" ? "Product images work best as transparent PNGs. " : ""}Uploads aren&apos;t pre-approved; an admin can approve them in the Library.</p>
          {storage !== "none" && caps?.persistent === false && <Setup title="Demo database">Image records live in the hosted demo&apos;s in-memory database, so saved images disappear when it resets. Connect a real database for them to last.</Setup>}
          {storage === "none" && caps && <Setup title="Image storage isn't connected">Uploads will only exist in this browser session, and generated ads will show a placeholder. Connect a Vercel Blob store to save them (see the README).</Setup>}
        </div>
      )}

      {tab === "drive" && (
        !caps || capsLoad !== "idle" ? <Loading leaving={capsLoad === "leaving"} /> : !caps.drive ? (
          <Setup title="Google Drive isn&apos;t connected"><p>Add a Google service account (<code>GOOGLE_SERVICE_ACCOUNT_JSON</code>) with the Drive API enabled, then share any file or folder with its email address.</p></Setup>
        ) : storage === "none" ? <Setup title="Needs image storage">Imported images are saved to storage first. Connect a Vercel Blob store to use Drive.</Setup> : (
          <div className="space-y-2">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => setDrive(await api("/api/import/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "resolve", url: driveUrl }) }))); }}>
              <label className="flex-1"><span className="sr-only">Google Drive link</span><input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="Paste a Drive file or folder link" className={inputCls} /></label>
              <Button type="submit" size="md" variant="outline" disabled={busy || !driveUrl.trim()}>Look up</Button>
            </form>
            <p className="text-xs text-brand-neutral-650">Share the file or folder with <strong className="break-all font-medium">{caps.driveEmail}</strong> first.</p>
            {drive?.type === "file" && <DriveRow file={drive.file} busy={busy} onUse={importDrive} />}
            {drive?.type === "folder" && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium"><FolderOpen className="size-3.5" aria-hidden />{drive.name} · {drive.files.length} image{drive.files.length === 1 ? "" : "s"}</p>
                <ul className="max-h-48 divide-y divide-brand-neutral-150 overflow-y-auto rounded-lg border border-brand-neutral-200">{drive.files.map((f) => <li key={f.id}><DriveRow file={f} busy={busy} onUse={importDrive} /></li>)}{drive.files.length === 0 && <li className="p-3 text-xs text-brand-neutral-650">No PNG, JPG or WebP images in this folder.</li>}</ul>
              </div>
            )}
          </div>
        )
      )}

      {tab === "figma" && (
        !caps || capsLoad !== "idle" ? <Loading leaving={capsLoad === "leaving"} /> : !caps.figma ? (
          <Setup title="Figma isn&apos;t connected"><p>Add a Figma personal access token (<code>FIGMA_TOKEN</code>) with read access to your files.</p></Setup>
        ) : storage === "none" ? <Setup title="Needs image storage">Imported images are saved to storage first. Connect a Vercel Blob store to use Figma.</Setup> : (
          <div className="space-y-2">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => setFigma(await api("/api/import/figma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "resolve", url: figmaUrl }) }))); }}>
              <label className="flex-1"><span className="sr-only">Figma link</span><input value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="Paste a link to a frame or layer" className={inputCls} /></label>
              <Button type="submit" size="md" variant="outline" disabled={busy || !figmaUrl.trim()}>Look up</Button>
            </form>
            <p className="text-xs text-brand-neutral-650">In Figma, select the layer, then Copy link to selection. It&apos;s rendered as a PNG at up to 2×.</p>
            {figma && (
              <div className="flex items-center gap-3 rounded-lg border border-brand-neutral-200 p-2">
                {figma.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={figma.previewUrl} alt="" className="size-14 rounded bg-brand-neutral-100 object-contain" />
                ) : <span className="grid size-14 place-items-center rounded bg-brand-neutral-100"><ImageIcon className="size-5 text-brand-neutral-550" aria-hidden /></span>}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{figma.name}</p><p className="text-xs text-brand-neutral-650">{figma.width}×{figma.height}</p></div>
                <Button size="sm" disabled={busy} onClick={() => run(async () => picked((await api<{ asset: AssetDto }>("/api/import/figma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", url: figmaUrl, kind }) })).asset))}><Frame /> {busy ? "Importing…" : "Import"}</Button>
              </div>
            )}
          </div>
        )
      )}

      {busy && <p className="text-xs text-brand-neutral-650" role="status">Working…</p>}
      {error && <p role="alert" className="text-xs text-brand-red-500">{error}</p>}
    </div>
  );
}

function DriveRow({ file, busy, onUse }: { file: { id: string; name: string; size?: number }; busy: boolean; onUse: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 p-2">
      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{file.name}</span>{file.size !== undefined && <span className="text-xs text-brand-neutral-650">{(file.size / 1e6).toFixed(1)} MB</span>}</span>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onUse(file.id)}>Import</Button>
    </div>
  );
}
