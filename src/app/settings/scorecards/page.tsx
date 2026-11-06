import { connection } from "next/server";
import { ScoreSettings } from "@/components/settings/ScoreSettings";
import { getDb } from "@/db";
import { getGate } from "@/lib/db/repo";
import { Loadable } from "@/components/ui/loadable";

export const metadata = { title: "Scorecard rules · Ad Studio" };

async function Content() {
  await connection();
  return <ScoreSettings gate={await getGate(await getDb())} />;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
