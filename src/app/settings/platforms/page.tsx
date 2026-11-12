import { connection } from "next/server";
import { PlatformManager } from "@/components/settings/PlatformManager";
import { getDb } from "@/db";
import { listAds } from "@/lib/db/repo";
import { Loadable } from "@/components/ui/loadable";
import { allPlacements, BUILTIN_PLATFORMS, customPlatforms, platformColor, platformLabel } from "@/lib/specs/platforms";

export const metadata = { title: "Platforms · Ad Studio" };

async function Content() {
  await connection();
  const ads = await listAds(await getDb()); // also refreshes the platform list
  const placements = allPlacements();
  const rows = [...BUILTIN_PLATFORMS, ...customPlatforms().map((c) => c.key)].map((key) => ({
    key,
    label: platformLabel(key),
    color: platformColor(key),
    builtin: (BUILTIN_PLATFORMS as readonly string[]).includes(key),
    ads: ads.filter((a) => a.platform === key).length,
    placements: placements.filter((p) => p.platform === key).map((p) => ({ label: p.label, sizes: p.sizes.map((s) => `${s.w}×${s.h}`).join(", "), verified: p.verifiedOn !== null })),
  }));
  return <PlatformManager platforms={rows} />;
}

export default function Page() {
  return <Loadable><Content /></Loadable>;
}
