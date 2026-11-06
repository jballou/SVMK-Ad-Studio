"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { FADE_MS, holdTimeMs } from "@/lib/loading";
import { Loading } from "./loading";

/** Records when a boundary's loader first appeared, so the content can wait for the loader's minimum time. */
const GateContext = createContext<Map<string, number> | null>(null);
const GateId = createContext<string>("");
/** Called when the loader appears again after content was already shown (e.g. a filter change), so the hold is re-decided. */
const GateBump = createContext<() => void>(() => {});

/**
 * Like <Suspense> with a loader, but the loader plays for at least MIN_VISIBLE_MS before it fades out and the
 * content replaces it. A load that finishes before the loader would even appear shows no loader at all.
 */
export function Loadable({ children, label }: { children: ReactNode; label?: string }) {
  const [starts] = useState(() => new Map<string, number>());
  const id = useId();
  const [epoch, setEpoch] = useState(0);
  const bump = useCallback(() => setEpoch((e) => e + 1), []);
  return (
    <GateContext.Provider value={starts}>
      <GateId.Provider value={id}>
        <GateBump.Provider value={bump}>
          <Suspense fallback={<Waiting label={label} />}>
            <Hold key={epoch} label={label}>{children}</Hold>
          </Suspense>
        </GateBump.Provider>
      </GateId.Provider>
    </GateContext.Provider>
  );
}

function Waiting({ label }: { label?: string }) {
  const starts = useContext(GateContext);
  const id = useContext(GateId);
  const bump = useContext(GateBump);
  useEffect(() => {
    starts?.set(id, performance.now());
    bump();
  }, [starts, id, bump]);
  return <Loading label={label} />;
}

type Phase = "holding" | "leaving" | "done";

function Hold({ children, label }: { children: ReactNode; label?: string }) {
  const starts = useContext(GateContext);
  const id = useContext(GateId);
  // Decided once, when the content first becomes ready.
  const [{ phase: first, wait }] = useState<{ phase: Phase; wait: number }>(() => {
    const t0 = starts?.get(id);
    const hold = t0 === undefined ? null : holdTimeMs(performance.now() - t0);
    return hold === null ? { phase: "done", wait: 0 } : { phase: "holding", wait: hold };
  });
  const [phase, setPhase] = useState<Phase>(first);

  useEffect(() => {
    if (first !== "holding") return;
    const leave = setTimeout(() => setPhase("leaving"), wait);
    const done = setTimeout(() => setPhase("done"), wait + FADE_MS);
    return () => { clearTimeout(leave); clearTimeout(done); };
  }, [first, wait]);

  return (
    <>
      {phase !== "done" && <Loading label={label} instant leaving={phase === "leaving"} />}
      <div style={{ display: phase === "done" ? "contents" : "none" }}>{children}</div>
    </>
  );
}
