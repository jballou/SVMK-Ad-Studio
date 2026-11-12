import { connection } from "next/server";
import { customPlatforms } from "@/lib/specs/platforms";
import { PlatformRegistry } from "@/components/ui/platform-registry";
import { BenchmarkManager } from "@/components/settings/BenchmarkManager";
import { getDb } from "@/db";
import { listBenchmarkRows } from "@/lib/db/repo";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Benchmarks · Ad Studio" };

async function Content() {
  await connection();
  const rows = await listBenchmarkRows(await getDb());
  return <><PlatformRegistry platforms={customPlatforms()} /><BenchmarkManager rows={rows} /></>;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
