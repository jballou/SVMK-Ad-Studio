import { Chip, type ChipVariant } from "@/components/ui/chip";
import type { AdStatus } from "@/lib/ads/types";
import { BAND_LABEL, type Band } from "@/lib/scorecard/score";
import type { PlatformKey } from "@/lib/specs/platforms";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/ui/colors";
import { Dot, Pause, Archive, FileEdit } from "lucide-react";

const STATUS: Record<AdStatus, { variant: ChipVariant; label: string }> = {
  live: { variant: "completed", label: "Live" },
  paused: { variant: "pending", label: "Paused" },
  retired: { variant: "information", label: "Retired" },
  draft: { variant: "label", label: "Draft" },
};

export function StatusChip({ status, className }: { status: AdStatus; className?: string }) {
  const s = STATUS[status];
  const icon = status === "paused" ? Pause : status === "retired" ? Archive : status === "draft" ? FileEdit : undefined;
  return (
    <Chip variant={s.variant} icon={icon} chevron={false} className={`!px-2.5 !py-1 !text-xs ${className ?? ""}`}>
      {s.label}
    </Chip>
  );
}

const BAND: Record<Band, ChipVariant> = { "keep-scale": "completed", "monitor-optimize": "information", "optimize-test": "pending", "refresh-pause": "failed" };

export function BandChip({ band, percent, className }: { band: Band; percent: number; className?: string }) {
  return (
    <Chip variant={BAND[band]} className={`!px-2.5 !py-1 !text-xs ${className ?? ""}`}>
      {percent}% · {BAND_LABEL[band]}
    </Chip>
  );
}

export function TooEarlyChip({ className }: { className?: string }) {
  return <Chip variant="label" icon={Dot} chevron={false} className={`!px-2.5 !py-1 !text-xs ${className ?? ""}`}>Too early</Chip>;
}

export function PlatformBadge({ platform }: { platform: PlatformKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-neutral-700">
      <span aria-hidden className="size-2 rounded-full" style={{ background: PLATFORM_COLOR[platform] }} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}
