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
    <nav aria-label={label} className="mb-6 max-w-full overflow-x-auto pb-1">
      <ul suppressHydrationWarning className="seg seg-md min-w-max">
        {items.map((t, i) => {
          const active = i === 0 ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className="flex">
              <Link href={t.href} aria-current={active ? "page" : undefined} className="seg-item">{t.label}</Link>
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
