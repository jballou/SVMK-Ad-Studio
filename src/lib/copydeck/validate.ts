import type { DeckRow } from "./parse";
import { parseAdBase } from "./parse";

export interface CopyIssue {
  rowNumber: number;
  adName: string;
  field: string;
  severity: "error" | "warn";
  message: string;
}

export type Limits = Record<string, number>;

/** LinkedIn single image limits from the placement spec (field name -> max chars). */
export const LINKEDIN_LIMITS: Limits = { headline: 70, intro: 150, offerHeadline: 60 };

export function validateRows(rows: DeckRow[], limits: Limits): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const push = (field: string, severity: CopyIssue["severity"], message: string) =>
      issues.push({ rowNumber: r.rowNumber, adName: r.adName, field, severity, message });
    if (!parseAdBase(r.adName)) push("adName", "error", "Ad name must be {ConceptKey}{MMYYYY}");
    if (seen.has(r.adName)) push("adName", "error", "Duplicate ad name");
    seen.add(r.adName);
    for (const [field, max] of Object.entries(limits)) {
      const text = r.fields[field as keyof DeckRow["fields"]];
      if (text && text.length > max) push(field, "error", `${text.length}/${max} characters`);
      else if (text && text.length > max - 3) push(field, "warn", `${text.length}/${max} characters (near limit)`);
    }
    if (!r.fields.headline) push("headline", "warn", "Missing headline");
  }
  return issues;
}
