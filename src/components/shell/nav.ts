import { BarChart3, ClipboardCheck, Download, Images, LayoutDashboard, Layers, Library, Settings, SquareDashedPlus, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should light this item up. */
  match?: string[];
}

export const NAV: { heading: string; items: NavItem[] }[] = [
  { heading: "Workspace", items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/gallery", label: "Ad gallery", icon: Images },
  ] },
  { heading: "Create", items: [
    { href: "/batches/new", label: "New batch", icon: SquareDashedPlus },
    { href: "/batches", label: "Batches", icon: Layers },
  ] },
  { heading: "Performance", items: [
    { href: "/performance", label: "Analytics", icon: BarChart3 },
    { href: "/scorecards", label: "Scorecards", icon: ClipboardCheck },
  ] },
  { heading: "Manage", items: [
    { href: "/export", label: "Export", icon: Download },
    { href: "/library", label: "Library", icon: Library },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.href === "/batches") return pathname === "/batches";
  return pathname === item.href || pathname.startsWith(`${item.href}/`) || !!item.match?.some((m) => pathname.startsWith(m));
}
