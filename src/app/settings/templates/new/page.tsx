import { connection } from "next/server";
import { TemplateCreator } from "@/components/settings/TemplateCreator";
import { Loadable } from "@/components/ui/loadable";
import { PlatformRegistry } from "@/components/ui/platform-registry";
import { getDb } from "@/db";
import { getTaxonomy } from "@/lib/db/repo";
import { customPlatforms } from "@/lib/specs/platforms";

export const metadata = { title: "New template · Ad Studio" };

async function Content() {
  await connection();
  const taxonomy = await getTaxonomy(await getDb()); // also refreshes the platform list
  return <><PlatformRegistry platforms={customPlatforms()} /><TemplateCreator taxonomy={taxonomy} /></>;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
