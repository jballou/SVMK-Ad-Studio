import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-neutral-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-brand-neutral-650">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, description, actions, children, className = "", padded = true }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`min-w-0 rounded-xl border border-brand-neutral-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-neutral-150 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-brand-neutral-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-brand-neutral-650">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** KPI tile. `delta` is a percent change; `goodWhen` says which direction is an improvement. */
export function Stat({ label, value, sub, delta, goodWhen = "up", href }: { label: string; value: string; sub?: string; delta?: number; goodWhen?: "up" | "down"; href?: string }) {
  const good = delta === undefined ? undefined : goodWhen === "up" ? delta >= 0 : delta <= 0;
  const body = (
    <div className="rounded-xl border border-brand-neutral-200 bg-white p-4 transition-colors hover:border-brand-neutral-300">
      <p className="text-xs font-medium text-brand-neutral-650">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-brand-neutral-900">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${good ? "text-brand-green-600" : "text-brand-red-500"}`}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {Math.abs(delta).toFixed(1)}%
            <span className="sr-only">{good ? " improvement" : " decline"}</span>
          </span>
        )}
        {sub && <span className="text-brand-neutral-650">{sub}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500">{body}</Link> : body;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-neutral-250 p-10 text-center">
      <p className="text-sm font-medium text-brand-neutral-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-brand-neutral-650">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function DataTable({ columns, children, caption }: { columns: { label: string; align?: "right"; className?: string }[]; children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-brand-neutral-200 text-xs text-brand-neutral-650">
            {columns.map((c) => (
              <th key={c.label} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium first:pl-0 last:pr-0 ${c.align === "right" ? "text-right" : ""} ${c.className ?? ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-neutral-150">{children}</tbody>
      </table>
    </div>
  );
}
