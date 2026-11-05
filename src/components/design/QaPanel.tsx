"use client";

import { AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import type { QaIssue } from "@/lib/composition/qa";

export function QaIssues({ issues, onFix, onFixAlso, onFixAll, sizesWith }: { issues: QaIssue[]; onFix: (i: QaIssue) => void; onFixAlso?: (i: QaIssue) => void; onFixAll?: (i: QaIssue) => void; sizesWith?: (i: QaIssue) => number }) {
  if (issues.length === 0) return <p className="flex items-center gap-2 text-sm text-brand-green-700"><CircleCheck className="size-4" aria-hidden />No issues at this size.</p>;
  return (
    <ul className="space-y-2">
      {issues.map((i) => (
        <li key={i.id} className={`rounded-lg border p-2.5 text-sm ${i.severity === "error" ? "border-brand-red-200 bg-brand-red-100/50" : "border-brand-yellow-200 bg-brand-yellow-100/60"}`}>
          <p className="flex items-start gap-2">
            {i.severity === "error" ? <CircleX className="mt-0.5 size-4 shrink-0 text-brand-red-500" aria-hidden /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-orange-600" aria-hidden />}
            <span><span className="sr-only">{i.severity === "error" ? "Error: " : "Warning: "}</span>{i.message}</span>
          </p>
          {i.fix && <div className="mt-2 flex flex-wrap gap-2 pl-6"><Button size="sm" variant="outline" onClick={() => onFix(i)}>{i.fix.label}</Button>{i.alsoFix && onFixAlso && <Button size="sm" variant="outline" onClick={() => onFixAlso(i)}>{i.alsoFix.label}</Button>}{onFixAll && (sizesWith?.(i) ?? 0) > 1 && <Button size="sm" variant="ghost" onClick={() => onFixAll(i)}>Fix at all {sizesWith!(i)} sizes</Button>}</div>}
        </li>
      ))}
    </ul>
  );
}
