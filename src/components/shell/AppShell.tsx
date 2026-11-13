"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { PanelLeft, Plus, Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { SegIndicator } from "@/components/ui/seg-indicator";
import { NAV, SETTINGS_ITEM, isActive, type NavItem } from "./nav";

const PREF_KEY = "sidebar-pref-v1";

/** Same row look as Brand Creative Hub: white pill on the active page, a soft wash on hover. */
const row = (active: boolean, collapsed: boolean) =>
  `relative flex items-center gap-2 rounded-tight py-2 text-sm font-medium ${collapsed ? "justify-center px-2" : "px-4"} ${active ? "bg-white text-ink shadow-sm" : "text-n-800 hover:bg-white/60"}`;

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link href={item.href} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined} className={row(active, collapsed)}>
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {!collapsed && <span className="flex-1">{item.label}</span>}
    </Link>
  );
}

function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return <Link href="/gallery" aria-label="Search ads" title="Search ads" className="btn btn-md btn-secondary mb-4 w-full !px-0"><Search className="size-4" aria-hidden /></Link>;
  }
  return (
    <form action="/gallery" role="search" className="relative mb-4">
      <label htmlFor="global-search" className="sr-only">Search ads and concepts</label>
      <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-n-700" />
      <input id="global-search" name="q" type="search" placeholder="Search" className="h-10 w-full rounded-tight border border-control bg-card pl-10 pr-4 text-sm text-ink placeholder:text-n-700" />
    </form>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [pref, setPref] = useState<"expanded" | "collapsed" | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(PREF_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "expanded" || v === "collapsed") setPref(v);
    } catch { /* storage unavailable */ }
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Without a saved choice the sidebar starts as an icon rail on small screens, like the Hub.
  const collapsed = (pref ?? (narrow ? "collapsed" : "expanded")) === "collapsed";
  const toggle = () => {
    const next = collapsed ? "expanded" : "collapsed";
    setPref(next);
    try { localStorage.setItem(PREF_KEY, next); } catch { /* ignore */ }
  };

  return (
    <nav aria-label="Main" className={`sticky top-0 z-40 flex h-screen shrink-0 flex-col p-4 motion-safe:transition-[width] ${collapsed ? "w-16" : "w-64"}`}>
      <div className={`mb-4 flex ${collapsed ? "flex-col items-center gap-2" : "items-center gap-2"}`}>
        <Link href="/" title="Ad Studio" className={`flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-ink ${collapsed ? "justify-center" : ""}`}>
          <Logo size={32} />
          {!collapsed && <span className="truncate">Ad Studio</span>}
        </Link>
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="btn btn-ghost btn-icon shrink-0 text-n-800">
          <PanelLeft className="size-[18px]" aria-hidden />
        </button>
      </div>

      <SidebarSearch collapsed={collapsed} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {NAV.map((group, i) => (
          <div key={group.heading} className={i === 0 ? "" : "mt-4"}>
            {!collapsed && <p className="mb-2 px-4 text-muted eyebrow">{group.heading}</p>}
            <div className="flex flex-col">{group.items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-line pt-2">
        <NavLink item={SETTINGS_ITEM} pathname={pathname} collapsed={collapsed} />
      </div>
      <div className={`mt-2 flex gap-2 border-t border-line pt-2 ${collapsed ? "flex-col items-center" : "items-center"}`}>
        <span title="Jarrod B." aria-label="Signed in as Jarrod B." className="grid size-8 shrink-0 place-items-center rounded-round bg-brand-periwinkle-200 text-xs font-bold text-brand-periwinkle-800">JB</span>
        {!collapsed && <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">Jarrod B.</span>}
      </div>
    </nav>
  );
}

/** The slim bar above each page: the page's title (drawn here by PageTitle) and the primary action. Same bar as the Hub. */
function TopBar() {
  return (
    <header className="shrink-0 border-b border-line text-sm text-muted">
      <div className="column flex h-16 items-center gap-4">
        <div id="page-title" className="min-w-0 truncate text-xl font-bold text-ink empty:hidden" />
        <div className="ml-auto">
          <Link href="/batches/new" className="btn btn-md btn-primary"><Plus className="size-4" aria-hidden /> New batch</Link>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-tight focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
      {/* usePathname is request-time data, so the sidebar sits behind Suspense; the fallback is the same width. */}
      <Suspense fallback={<div className="w-64 shrink-0" />}><Sidebar /></Suspense>
      <div className="shell my-2 mr-2 flex min-h-[calc(100vh-16px)] min-w-0 flex-1 flex-col overflow-clip rounded-loose border border-line bg-paper shadow-sm first:ml-2">
        <TopBar />
        <Suspense fallback={null}><SegIndicator /></Suspense>
        <main id="main" className="paper flex min-w-0 flex-1 flex-col">
          <div className="page flex-1">{children}</div>
          {/* Pinned bars (see PageFooter) render here, full width of the panel. */}
          <div id="page-footer" className="sticky bottom-0 z-30 empty:hidden" />
        </main>
      </div>
    </div>
  );
}
