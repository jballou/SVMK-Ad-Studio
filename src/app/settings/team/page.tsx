import { Chip } from "@/components/ui/chip";
import { Card, DataTable } from "@/components/ui/primitives";

export const metadata = { title: "Team · Ad Studio" };

const TEAM = [
  { name: "Jarrod B.", role: "Admin", team: "Brand Design", last: "Today" },
  { name: "Alex Rivera", role: "Editor", team: "Brand Design", last: "Today" },
  { name: "Priya Shah", role: "Editor", team: "Paid Media", last: "Yesterday" },
  { name: "Marcus Lee", role: "Editor", team: "Paid Media", last: "Oct 30" },
  { name: "Dana Whitfield", role: "Viewer", team: "Product Marketing", last: "Oct 28" },
];

export default function Team() {
  return (
    <Card title="People" description="Sign-in will use the company SSO provider once the hosted environment is set up." padded={false}>
      <div className="px-5 py-3">
        <DataTable caption="Team members" columns={[{ label: "Name" }, { label: "Role" }, { label: "Team" }, { label: "Last active" }]}>
          {TEAM.map((m) => (
            <tr key={m.name}><td className="py-2.5 pr-3 font-medium">{m.name}</td><td className="px-3"><Chip variant={m.role === "Admin" ? "completed" : m.role === "Editor" ? "information" : "label"} chevron={false} className="!px-2.5 !py-1 !text-xs">{m.role}</Chip></td><td className="px-3 text-brand-neutral-750">{m.team}</td><td className="py-2.5 pl-3 text-brand-neutral-650">{m.last}</td></tr>
          ))}
        </DataTable>
      </div>
    </Card>
  );
}
