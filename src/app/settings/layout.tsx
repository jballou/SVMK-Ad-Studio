import { NavTabs } from "@/components/ui/nav-tabs";
import { PageHeader } from "@/components/ui/primitives";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Settings" description="Connections, benchmarks, scoring rules, tags and people." />
      <NavTabs label="Settings sections" items={[
        { href: "/settings", label: "Integrations" },
        { href: "/settings/benchmarks", label: "Benchmarks" },
        { href: "/settings/scorecards", label: "Scorecard rules" },
        { href: "/settings/tags", label: "Tags" },
        { href: "/settings/team", label: "Team" },
      ]} />
      {children}
    </>
  );
}
