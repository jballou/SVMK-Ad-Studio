/** Horizontal bar list: label, bar, value. Values are scaled to the largest item. */
export function HBar({ items, format = (n: number) => String(Math.round(n)), label }: { items: { label: string; value: number; color?: string; sub?: string }[]; format?: (n: number) => string; label: string }) {
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-brand-neutral-800" title={i.label}>{i.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-brand-neutral-150">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.color ?? "#7068EB" }} />
          </span>
          <span className="text-right tabular-nums text-brand-neutral-900">{format(i.value)}{i.sub && <span className="ml-1.5 text-xs text-brand-neutral-650">{i.sub}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
