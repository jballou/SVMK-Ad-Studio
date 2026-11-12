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

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** A specific from/to pair (inclusive) from the URL, or undefined when missing or invalid. Compares with the same number of days before. */
export function customBounds(from: string | undefined, to: string | undefined): { from: string; to: string; prevFrom: string; prevTo: string } | undefined {
  if (!from || !to || !ISO.test(from) || !ISO.test(to) || from > to) return undefined;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  return { from, to, prevFrom: shiftDate(from, -days), prevTo: shiftDate(from, -1) };
}

export function rangeBounds(key: RangeKey, asOf: string): { from: string; to: string; prevFrom?: string; prevTo?: string } {
  const days = RANGES.find((r) => r.key === key)!.days;
  if (!days) return { from: "0000-00-00", to: asOf };
  return { from: shiftDate(asOf, -(days - 1)), to: asOf, prevFrom: shiftDate(asOf, -(2 * days - 1)), prevTo: shiftDate(asOf, -days) };
}
