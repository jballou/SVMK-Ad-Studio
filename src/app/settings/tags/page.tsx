import { connection } from "next/server";
import { TaxonomyEditor } from "@/components/settings/TaxonomyEditor";
import { getDb } from "@/db";
import { getTaxonomy } from "@/lib/db/repo";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Tags · Ad Studio" };

async function Content() {
  await connection();
  return <TaxonomyEditor taxonomy={await getTaxonomy(await getDb())} />;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
