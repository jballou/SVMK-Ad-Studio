"use client";

import { useSyncExternalStore, useTransition } from "react";
import { setDummyData } from "@/app/actions";

const COOKIE = "ad-studio-dummy";
const read = () => (typeof document !== "undefined" && document.cookie.split("; ").some((c) => c === `${COOKIE}=off`) ? "off" : "on");
const subscribe = (cb: () => void) => { window.addEventListener("dummy-data", cb); return () => window.removeEventListener("dummy-data", cb); };

/** A floating switch for the demo data. Off shows only real ads and real numbers, with plain messages where data is missing. */
export function DummyToggle() {
  const state = useSyncExternalStore(subscribe, read, () => "on");
  const [pending, start] = useTransition();
  const on = state === "on";
  const flip = () => start(async () => {
    await setDummyData(!on);
    window.dispatchEvent(new Event("dummy-data"));
  });
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={flip} disabled={pending}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-round border border-brand-neutral-250 bg-card px-4 py-2 text-sm font-medium text-ink shadow-lg [body:has(#page-footer>*)_&]:bottom-24 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-periwinkle-500 disabled:opacity-70"
    >
      <span aria-hidden className={`relative h-4 w-8 rounded-round transition-colors ${on ? "bg-brand-green-600" : "bg-brand-neutral-350"}`}>
        <span className={`absolute top-0 size-4 rounded-round bg-white shadow transition-[left] ${on ? "left-4" : "left-0"}`} />
      </span>
      Dummy data {on ? "on" : "off"}
    </button>
  );
}
