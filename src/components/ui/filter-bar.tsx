import Link from "next/link";
import { platformKeys } from "@/lib/specs/platforms";
import { PLATFORM_LABEL } from "@/lib/ui/colors";

const field = "h-10 rounded-tight border border-control bg-card px-4 text-sm text-ink";

/** Platform and specific-days filters as a plain GET form, so the URL holds the state. */
export function FilterBar({ basePath, platform, from, to }: { basePath: string; platform?: string; from?: string; to?: string }) {
  const active = Boolean(platform || (from && to));
  return (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-4" aria-label="Filters">
      <label className="text-xs font-medium text-muted">Platform
        <select name="platform" defaultValue={platform ?? ""} className={`${field} mt-0 block`}>
          <option value="">All platforms</option>
          {platformKeys().map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-muted">From
        <input type="date" name="from" defaultValue={from ?? ""} className={`${field} mt-0 block`} />
      </label>
      <label className="text-xs font-medium text-muted">To
        <input type="date" name="to" defaultValue={to ?? ""} className={`${field} mt-0 block`} />
      </label>
      <button type="submit" className="btn btn-md btn-secondary">Apply</button>
      {active && <Link href={basePath} className="self-center text-sm text-muted underline">Clear</Link>}
    </form>
  );
}
