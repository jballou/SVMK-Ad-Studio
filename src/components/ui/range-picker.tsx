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
    <div role="group" aria-label="Date range" suppressHydrationWarning className="seg">
      {RANGES.map((r) => (
        <Link key={r.key} href={href(r.key)} aria-current={r.key === current ? "true" : undefined} className="seg-item">{r.label}</Link>
      ))}
    </div>
  );
}
