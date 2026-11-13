import { connection } from "next/server";
import { TemplateList, type TemplateCard } from "@/components/settings/TemplateList";
import { Loadable } from "@/components/ui/loadable";
import { PlatformRegistry } from "@/components/ui/platform-registry";
import { getDb } from "@/db";
import { listTemplates } from "@/lib/db/repo";
import { customPlatforms } from "@/lib/specs/platforms";

export const metadata = { title: "Templates · Ad Studio" };

async function Content() {
  await connection();
  const rows = await listTemplates(await getDb()); // also refreshes the platform list
  const cards: TemplateCard[] = rows.map((r) => {
    const issues = (r.spec?.frames ?? []).flatMap((f) => f.issues);
    return {
      id: r.id, name: r.name, description: r.description, status: r.status, intent: r.intent, campaign: r.campaign, funnels: r.funnels, personas: r.personas, platforms: r.platforms,
      sizes: (r.spec?.frames ?? []).map((f) => `${f.width}×${f.height}`), errors: issues.filter((i) => i.severity === "error").length, warnings: issues.filter((i) => i.severity === "warn").length,
      thumb: r.thumb, fromFigma: !!r.spec, updatedAt: r.updatedAt,
    };
  });
  return <><PlatformRegistry platforms={customPlatforms()} /><TemplateList templates={cards} /></>;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
