import Link from "next/link";
import { PLATFORM_LABEL } from "@/lib/ui/colors";
import type { PlatformKey } from "@/lib/specs/platforms";

const field = "h-8.5 rounded-md border border-brand-neutral-250 bg-white px-2 text-sm";

/** Platform and specific-days filters as a plain GET form, so the URL holds the state. */
export function FilterBar({ basePath, platform, from, to }: { basePath: string; platform?: string; from?: string; to?: string }) {
  const active = Boolean(platform || (from && to));
  return (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-3" aria-label="Filters">
      <label className="text-xs font-medium text-brand-neutral-650">Platform
        <select name="platform" defaultValue={platform ?? ""} className={`${field} mt-1 block`}>
          <option value="">All platforms</option>
          {(Object.keys(PLATFORM_LABEL) as PlatformKey[]).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-brand-neutral-650">From
        <input type="date" name="from" defaultValue={from ?? ""} className={`${field} mt-1 block`} />
      </label>
      <label className="text-xs font-medium text-brand-neutral-650">To
        <input type="date" name="to" defaultValue={to ?? ""} className={`${field} mt-1 block`} />
      </label>
      <button type="submit" className="h-8.5 rounded-md bg-brand-neutral-900 px-3 text-sm font-medium text-white">Apply</button>
      {active && <Link href={basePath} className="h-8.5 self-end py-1.5 text-sm text-brand-neutral-650 underline">Clear</Link>}
    </form>
  );
}
