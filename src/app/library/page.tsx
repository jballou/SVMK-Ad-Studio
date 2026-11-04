import { connection } from "next/server";
import { Suspense } from "react";
import { AssetManager } from "@/components/settings/AssetManager";
import { TemplateGrid } from "@/components/settings/TemplateGrid";
import { toDto } from "@/lib/assets/ingest";
import { getDb } from "@/db";
import { listAssetRows } from "@/lib/db/repo";
import { Chip } from "@/components/ui/chip";
import { Card, DataTable, PageHeader } from "@/components/ui/primitives";
import { checkCopy } from "@/lib/batches/plan";
import { COPY_DECKS, DECK_LIMITS, TEMPLATE_FILES } from "@/lib/dummy/library";
import { fmtDate } from "@/lib/format";
import { PLACEMENTS } from "@/lib/specs/platforms";
import { PLATFORM_LABEL } from "@/lib/ui/colors";

export const metadata = { title: "Library · Ad Studio" };

const SLOTS: [string, string, string][] = [
  ["#headline", "Text", "In-image headline (deck: In Asset Copy)"],
  ["#subhead", "Text", "Supporting line"],
  ["#stat", "Text", "Callout number, e.g. “80%”"],
  ["#cta", "Text", "In-image button label"],
  ["#hero", "Image or rectangle", "Swappable photo or illustration"],
  ["#logo", "Component instance", "Brand or co-brand lockup"],
  ["#bg", "Fill", "Background color token"],
];

async function Assets() {
  await connection();
  return <AssetManager assets={(await listAssetRows(await getDb())).map(toDto)} />;
}

export default function Library() {
  return (
    <div className="space-y-8">
      <PageHeader title="Library" description="The Figma templates and copy decks that batches are generated from, and the conventions that connect them." />

      <section aria-labelledby="tpl"><h2 id="tpl" className="mb-3 text-base font-semibold">Figma templates</h2><TemplateGrid templates={TEMPLATE_FILES} /></section>

      <section aria-labelledby="imgs">
        <h2 id="imgs" className="mb-1 text-base font-semibold">Uploaded and imported images</h2>
        <p className="mb-3 text-sm text-brand-neutral-650">Saved from uploads, Google Drive and Figma. Approving an image removes the &quot;needs brand review&quot; warning in the design editor.</p>
        <Suspense fallback={<p className="text-sm text-brand-neutral-650">Loading images…</p>}><Assets /></Suspense>
      </section>

      <section aria-labelledby="decks">
        <h2 id="decks" className="mb-3 text-base font-semibold">Copy decks</h2>
        <Card padded={false}><div className="px-5 py-3">
          <DataTable caption="Linked copy decks" columns={[{ label: "Spreadsheet" }, { label: "Tab" }, { label: "Rows", align: "right" }, { label: "Validation" }, { label: "Linked by" }, { label: "Synced" }]}>
            {COPY_DECKS.map((d) => {
              const errors = d.rows.filter((r) => checkCopy(r, DECK_LIMITS).some((c) => c.severity === "error")).length;
              return (
                <tr key={d.id}>
                  <td className="py-2.5 pr-3 font-medium">{d.name}<span className="block font-mono text-[11px] font-normal text-brand-neutral-550">{d.sheetId}</span></td>
                  <td className="px-3 text-brand-neutral-750">{d.tab}</td>
                  <td className="px-3 text-right tabular-nums">{d.rows.length}</td>
                  <td className="px-3">{errors ? <Chip variant="failed" chevron={false} className="!px-2.5 !py-1 !text-xs">{errors} with errors</Chip> : <Chip variant="completed" chevron={false} className="!px-2.5 !py-1 !text-xs">All valid</Chip>}</td>
                  <td className="px-3 text-brand-neutral-750">{d.linkedBy}</td>
                  <td className="py-2.5 pl-3 text-brand-neutral-650">{fmtDate(d.syncedAt)}</td>
                </tr>
              );
            })}
          </DataTable>
        </div></Card>
      </section>

      <section aria-labelledby="naming" className="grid gap-6 lg:grid-cols-2">
        <Card title="Figma naming scheme" description="So Ad Studio can find frames and edit the right layers">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs font-medium text-brand-neutral-650">Frame</dt><dd className="mt-0.5 font-mono text-[13px]">AD | YourBrand | 1200x1200</dd></div>
            <div><dt className="text-xs font-medium text-brand-neutral-650">Ad name and export filename</dt><dd className="mt-0.5 font-mono text-[13px]">YourBrand072025_1200x1200</dd><dd className="mt-1 text-xs text-brand-neutral-650">Concept + launch month and year + size. Paste it into the platform ad name so performance data can be matched back. If the same size runs on two platforms, one file is shared.</dd></div>
            <div><dt className="text-xs font-medium text-brand-neutral-650">Editable layers</dt><dd className="mt-1">
              <table className="w-full text-left text-xs"><caption className="sr-only">Editable layer names</caption><tbody className="divide-y divide-brand-neutral-150">{SLOTS.map(([n, t, d]) => <tr key={n}><th scope="row" className="py-1.5 pr-3 font-mono font-medium">{n}</th><td className="pr-3 text-brand-neutral-650">{t}</td><td>{d}</td></tr>)}</tbody></table>
              <p className="mt-2 text-xs text-brand-neutral-650">Add a limit with <span className="font-mono">#headline[40]</span>. Layers without <span className="font-mono">#</span> are locked.</p>
            </dd></div>
          </dl>
        </Card>
        <Card title="Placement specs" description="Sizes and safe zones used for previews and generation" padded={false}>
          <div className="px-5 py-3">
            <DataTable caption="Placement specs" columns={[{ label: "Placement" }, { label: "Sizes" }, { label: "Verified" }]}>
              {PLACEMENTS.map((p) => (
                <tr key={p.key}><td className="py-2 pr-3"><span className="font-medium">{p.label}</span><span className="block text-xs text-brand-neutral-650">{PLATFORM_LABEL[p.platform]}</span></td><td className="px-3 text-xs text-brand-neutral-750">{p.sizes.map((s) => `${s.w}×${s.h}`).join(", ")}</td><td className="py-2 pl-3 text-xs">{p.verifiedOn ? <span className="text-brand-green-600">{fmtDate(p.verifiedOn)}</span> : <span className="text-brand-orange-600">Not yet</span>}</td></tr>
              ))}
            </DataTable>
          </div>
        </Card>
      </section>
    </div>
  );
}
