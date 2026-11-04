import Link from "next/link";
import { RANGES, type RangeKey } from "@/lib/analytics/range";

export function RangePicker({ current, basePath, extra = {} }: { current: RangeKey; basePath: string; extra?: Record<string, string | undefined> }) {
  const href = (key: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    q.set("range", key);
    return `${basePath}?${q}`;
  };
  return (
    <div role="group" aria-label="Date range" className="inline-flex gap-1 rounded-lg bg-brand-neutral-150 p-1">
      {RANGES.map((r) => (
        <Link key={r.key} href={href(r.key)} aria-current={r.key === current ? "true" : undefined} className={`rounded-md px-3 py-1 text-xs font-medium ${r.key === current ? "bg-white text-brand-neutral-900 shadow-xs" : "text-brand-neutral-650 hover:text-brand-neutral-900"}`}>{r.label}</Link>
      ))}
    </div>
  );
}
