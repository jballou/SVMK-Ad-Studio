"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Sandbox only: logs when the loader appears, starts fading, and is replaced by content inside #region. */
export function Probe() {
  const [log, setLog] = useState<string[]>([]);
  const t0 = useRef(0);
  useEffect(() => {
    const region = document.getElementById("region");
    if (!region) return;
    t0.current = performance.now();
    let last = "";
    const note = (m: string) => setLog((l) => [...l, `${Math.round(performance.now() - t0.current)}ms ${m}`]);
    const check = () => {
      const l = region.querySelector(".loading-indicator");
      const done = !!region.querySelector("[data-slow-content]") && !(region.querySelector("[data-slow-content]")?.parentElement as HTMLElement | null)?.style.display.includes("none");
      const state = l ? (l.classList.contains("is-leaving") ? "loader fading out" : "loader showing") : done ? "content showing" : "empty";
      if (state !== last) { last = state; note(state); }
    };
    const obs = new MutationObserver(check);
    check();
    obs.observe(region, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    return () => obs.disconnect();
  }, []);
  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-2 text-sm">
        {[0, 100, 300, 600, 1500].map((ms) => <Link key={ms} href={`/preview/loadable?ms=${ms}`} prefetch={false} className="rounded-full border border-brand-neutral-250 bg-white px-3 py-1">load takes {ms}ms</Link>)}
      </nav>
      <pre id="timeline" className="rounded-lg bg-brand-neutral-100 p-3 text-xs">{log.join("\n") || "waiting…"}</pre>
    </div>
  );
}
