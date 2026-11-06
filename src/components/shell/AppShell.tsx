"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Menu, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { NAV, isActive } from "./nav";

// usePathname() is request-time data, so everything that reads it sits inside a Suspense boundary.
function ActiveNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavSlot({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname="" onNavigate={onNavigate} />}>
      <ActiveNav onNavigate={onNavigate} />
    </Suspense>
  );
}

function CloseOnRoute({ onRoute }: { onRoute: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onRoute();
  }, [pathname, onRoute]);
  return null;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-neutral-550">{group.heading}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500 ${active ? "bg-brand-green-100 text-brand-green-800" : "text-brand-neutral-750 hover:bg-brand-neutral-150"}`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3 py-1 focus-visible:outline-2 focus-visible:outline-brand-periwinkle-500">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-green-600 text-sm font-bold text-white">A</span>
      <span className="text-[15px] font-semibold tracking-tight text-brand-neutral-900">Ad Studio</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <div className="min-h-screen bg-brand-neutral-50 text-brand-neutral-900">
      <Suspense fallback={null}><CloseOnRoute onRoute={closeMenu} /></Suspense>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">Skip to content</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-brand-neutral-200 bg-white px-3 py-4 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto"><NavSlot /></div>
        <p className="px-3 text-[11px] text-brand-neutral-550">Dummy data · v0.1</p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-white px-3 py-4 shadow-xl">
            <div className="flex items-center justify-between"><Brand />
              <Button variant="ghost" size="icon" mode="icon" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavSlot onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}

      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-neutral-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" mode="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <form action="/gallery" role="search" className="relative max-w-md flex-1">
            <label htmlFor="global-search" className="sr-only">Search ads</label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-neutral-550" />
            <input id="global-search" name="q" type="search" placeholder="Search ads and concepts" className="h-9 w-full rounded-lg border border-brand-neutral-250 bg-brand-neutral-50 pl-9 pr-3 text-sm placeholder:text-brand-neutral-550 focus-visible:border-brand-green-400 focus-visible:outline-2 focus-visible:outline-brand-green-400/40" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <Button asChild size="md"><Link href="/batches/new"><Plus /> New batch</Link></Button>
            <span title="Jarrod B." className="hidden size-8 place-items-center rounded-full bg-brand-periwinkle-200 text-xs font-semibold text-brand-periwinkle-800 sm:grid" aria-label="Signed in as Jarrod B.">JB</span>
          </div>
        </header>
        <main id="main" className="w-full px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
