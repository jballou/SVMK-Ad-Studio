import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageTitle } from "./page-title";

/** Like the Hub, the title is drawn in the top bar (PageTitle); the page body starts with the description and content. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <PageTitle>{title}</PageTitle>
      {description && <p className="min-w-0 max-w-2xl text-sm text-muted">{description}</p>}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, description, actions, children, className = "", padded = true }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`card min-w-0 overflow-clip ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
            {description && <p className="text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </section>
  );
}

/** KPI tile. `delta` is a percent change; `goodWhen` says which direction is an improvement. */
export function Stat({ label, value, sub, delta, goodWhen = "up", href }: { label: string; value: string; sub?: string; delta?: number; goodWhen?: "up" | "down"; href?: string }) {
  const good = delta === undefined ? undefined : goodWhen === "up" ? delta >= 0 : delta <= 0;
  const body = (
    <div className="card p-6">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-2 font-medium ${good ? "text-data-ok" : "text-data-late"}`}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {Math.abs(delta).toFixed(1)}%
            <span className="sr-only">{good ? " improvement" : " decline"}</span>
          </span>
        )}
        {sub && <span className="text-muted">{sub}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block rounded-loose">{body}</Link> : body;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-loose border border-dashed border-control p-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>}
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
              <th key={c.label} scope="col" className={`whitespace-nowrap px-4 py-2 font-medium first:pl-0 last:pr-0 ${c.align === "right" ? "text-right" : ""} ${c.className ?? ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-neutral-150">{children}</tbody>
      </table>
    </div>
  );
}
