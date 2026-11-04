import { NavTabs } from "@/components/ui/nav-tabs";
import { PageHeader } from "@/components/ui/primitives";

export default function PerformanceLayout({ children }: LayoutProps<"/performance">) {
  return (
    <>
      <PageHeader title="Performance" description="How creative is performing across platforms, concepts, tests and time." />
      <NavTabs label="Performance sections" items={[
        { href: "/performance", label: "Overview" },
        { href: "/performance/platforms", label: "Platforms" },
        { href: "/performance/creatives", label: "Creatives & tags" },
        { href: "/performance/tests", label: "A/B tests" },
        { href: "/performance/fatigue", label: "Fatigue" },
      ]} />
      {children}
    </>
  );
}
