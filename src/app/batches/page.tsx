import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { Chip } from "@/components/ui/chip";
import { Card, DataTable, PageHeader } from "@/components/ui/primitives";
import { getDb } from "@/db";
import { listBatches } from "@/lib/db/repo";
import { dummyDataOn } from "@/lib/dummy-mode";
import { fmtDate } from "@/lib/format";
import { allPlacements } from "@/lib/specs/platforms";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Batches · Ad Studio" };

async function Content() {
  await connection();
  const batches = await listBatches(await getDb(), { includeSample: await dummyDataOn() });
  return (
    <Card padded={false}>
      <div className="px-4 py-4">
        <DataTable caption="Batches" columns={[{ label: "Batch" }, { label: "Concepts" }, { label: "Placements" }, { label: "Ads", align: "right" }, { label: "Status" }, { label: "Created" }]}>
          {batches.map((b) => (
            <tr key={b.id} className="align-top">
              <td className="py-4 pr-4 font-medium">{b.name}<span className="block text-xs font-normal text-brand-neutral-650">by {b.createdBy}</span></td>
              <td className="px-4 py-4"><ul className="flex max-w-xs flex-wrap gap-2">{b.config.concepts.map((c) => <li key={c}><Link href={`/gallery?q=${c}`} className="rounded-tight bg-brand-neutral-150 px-2 py-0 text-xs text-brand-neutral-800 hover:bg-brand-neutral-200">{c}</Link></li>)}</ul></td>
              <td className="px-4 py-4 text-xs text-brand-neutral-750">{b.config.placements.map((k) => allPlacements().find((p) => p.key === k)?.label ?? k).slice(0, 3).join(", ")}{b.config.placements.length > 3 && ` +${b.config.placements.length - 3}`}</td>
              <td className="px-4 py-4 text-right tabular-nums">{b.adCount}</td>
              <td className="px-4 py-4"><Chip variant={b.status === "exported" ? "completed" : "information"} chevron={false} className="!px-2 !py-0 !text-xs">{b.status === "exported" ? "Exported" : "Generated"}</Chip></td>
              <td className="py-4 pl-4 text-brand-neutral-650">{fmtDate(b.createdAt.toISOString())}</td>
            </tr>
          ))}
        </DataTable>
      </div>
    </Card>
  );
}

export default function Batches() {
  return (
    <>
      <PageHeader title="Batches" description="Every set of ads generated from a Figma template and copy deck." actions={<Button asChild><Link href="/batches/new"><Plus /> New batch</Link></Button>} />
      <Loadable><Content /></Loadable>
    </>
  );
}
