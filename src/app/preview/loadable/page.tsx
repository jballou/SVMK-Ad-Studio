import { Suspense } from "react";
import { connection } from "next/server";
import { Loadable } from "@/components/ui/loadable";
import { Probe } from "./Probe";

export const metadata = { title: "Loadable · Preview" };

async function Slow({ ms }: { ms: number }) {
  await connection();
  await new Promise((r) => setTimeout(r, ms));
  return <p data-slow-content className="rounded-lg border border-brand-green-200 bg-brand-green-100/50 p-4 text-sm">Content ready after a {ms}ms load.</p>;
}

export default function LoadablePreview({ searchParams }: { searchParams: Promise<{ ms?: string }> }) {
  return <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>;
}

async function Body({ searchParams }: { searchParams: Promise<{ ms?: string }> }) {
  await connection();
  const ms = Number((await searchParams).ms ?? 0) || 0;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-lg font-semibold">Loadable timing</h1>
      <p className="text-sm text-brand-neutral-650">Pick a load time. Under ~150ms no loader should appear; otherwise it should play for 1.5s in total, fade out, then show the content.</p>
      <Probe key={ms} />
      <div id="region" className="min-h-16 rounded-xl border border-brand-neutral-200 bg-white p-4">
        <Loadable key={ms}><Slow ms={ms} /></Loadable>
      </div>
    </main>
  );
}
