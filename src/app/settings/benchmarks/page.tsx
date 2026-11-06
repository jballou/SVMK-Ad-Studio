import { connection } from "next/server";
import { BenchmarkManager } from "@/components/settings/BenchmarkManager";
import { getDb } from "@/db";
import { listBenchmarkRows } from "@/lib/db/repo";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Benchmarks · Ad Studio" };

async function Content() {
  await connection();
  return <BenchmarkManager rows={await listBenchmarkRows(await getDb())} />;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
