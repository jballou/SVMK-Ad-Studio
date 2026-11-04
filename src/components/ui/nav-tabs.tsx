"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

export interface TabItem {
  href: string;
  label: string;
}

function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const pathname = usePathname();
  return <TabList items={items} label={label} pathname={pathname} />;
}

function TabList({ items, label, pathname }: { items: TabItem[]; label: string; pathname: string }) {
  return (
    <nav aria-label={label} className="mb-6 overflow-x-auto border-b border-brand-neutral-200">
      <ul className="flex min-w-max gap-1">
        {items.map((t, i) => {
          const active = i === 0 ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={`-mb-px block border-b-2 px-3.5 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-periwinkle-500 ${active ? "border-brand-green-600 text-brand-green-700" : "border-transparent text-brand-neutral-650 hover:text-brand-neutral-900"}`}>{t.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Link-based tabs. usePathname is request-time data, so it sits behind Suspense. */
export function NavTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <Suspense fallback={<TabList items={items} label={label} pathname="" />}>
      <Tabs items={items} label={label} />
    </Suspense>
  );
}
