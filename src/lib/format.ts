const int = new Intl.NumberFormat("en-US");
export const fmtInt = (n: number) => int.format(Math.round(n));
export const fmtCompact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const fmtMoney = (n: number, digits = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const fmtPct = (n: number | undefined, digits = 2) => (n === undefined || !Number.isFinite(n) ? "—" : `${n.toFixed(digits)}%`);
export const fmtDelta = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);

export function fmtDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
