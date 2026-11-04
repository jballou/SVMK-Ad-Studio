import { shiftDate } from "./aggregate";

export const RANGES = [
  { key: "30", label: "30 days", days: 30 },
  { key: "60", label: "60 days", days: 60 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

export function parseRange(v: string | undefined): RangeKey {
  return RANGES.some((r) => r.key === v) ? (v as RangeKey) : "30";
}

export function rangeBounds(key: RangeKey, asOf: string): { from: string; to: string; prevFrom?: string; prevTo?: string } {
  const days = RANGES.find((r) => r.key === key)!.days;
  if (!days) return { from: "0000-00-00", to: asOf };
  return { from: shiftDate(asOf, -(days - 1)), to: asOf, prevFrom: shiftDate(asOf, -(2 * days - 1)), prevTo: shiftDate(asOf, -days) };
}
