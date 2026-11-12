"use client";

import { useState } from "react";

const OPTIONS = [["left", "Left"], ["center", "Center"], ["right", "Right"]] as const;

/** Preview of the shared segmented control (the green pill slides between options; see globals.css `.seg`). */
export default function ToggleGroupBasic() {
  const [value, setValue] = useState<(typeof OPTIONS)[number][0]>("center");
  return (
    <div className="card flex w-full flex-col items-center px-4 py-12">
      <div role="group" aria-label="Alignment" suppressHydrationWarning className="seg seg-md">
        {OPTIONS.map(([v, label]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => setValue(v)} className="seg-item">{label}</button>
        ))}
      </div>
    </div>
  );
}
