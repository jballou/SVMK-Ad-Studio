import { Chip } from "@/components/ui/chip";
import type { ChipVariant } from "@/components/ui/chip";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Integrations · Ad Studio" };

type Status = "connected" | "pending" | "off";
const INTEGRATIONS: { name: string; blurb: string; status: Status; detail: string; needs?: string[] }[] = [
  { name: "Figma", blurb: "Reads template frames and exports PNGs.", status: "connected", detail: "Connected with a personal access token (read only). Token is stored server-side." },
  { name: "Google Sheets", blurb: "Reads copy decks.", status: "connected", detail: "Service account shared on 6 spreadsheets." },
  { name: "Meta Marketing API", blurb: "Performance for Facebook, Instagram and Threads.", status: "off", detail: "Not connected.", needs: ["A Meta developer app attached to the company Business Manager", "A system user with the ad accounts assigned", "A system-user token with ads_read", "Business verification, if Meta prompts for it"] },
  { name: "LinkedIn Marketing API", blurb: "Performance for LinkedIn campaigns.", status: "pending", detail: "Advertising API access requested; waiting on approval (can take weeks).", needs: ["A developer app linked to the company page", "The Advertising API product approved", "Scopes r_ads and r_ads_reporting", "Account Viewer or Manager role on the ad account"] },
  { name: "Google Ads API", blurb: "Performance for Display campaigns.", status: "off", detail: "Not connected.", needs: ["A developer token from the manager (MCC) account", "An OAuth client in Google Cloud", "Customer IDs and the MCC login-customer-id", "Read-only access"] },
  { name: "Newsletter partners", blurb: "Placement reports.", status: "off", detail: "No API. Upload the partner's CSV on the Scorecards page.", needs: ["Ask each partner for a recurring CSV or email report", "Make sure the ad name appears in the report"] },
];

const BADGE: Record<Status, { v: ChipVariant; label: string }> = { connected: { v: "completed", label: "Connected" }, pending: { v: "pending", label: "Pending approval" }, off: { v: "information", label: "Not connected" } };

export default function Integrations() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-neutral-650">Until a platform API is approved, upload its CSV export on the Scorecards page; it uses the same schema.</p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <li key={i.name}>
            <Card title={i.name} description={i.blurb} actions={<Chip variant={BADGE[i.status].v} chevron={false} className="!px-2.5 !py-1 !text-xs">{BADGE[i.status].label}</Chip>}>
              <p className="text-sm text-brand-neutral-750">{i.detail}</p>
              {i.needs && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-brand-green-700">What&apos;s needed to connect</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-neutral-750">{i.needs.map((n) => <li key={n}>{n}</li>)}</ul>
                </details>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
