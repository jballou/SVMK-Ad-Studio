import { Loading } from "@/components/ui/loading";

export const metadata = { title: "Loading indicator · Preview" };

export default function LoadingPreview() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-lg font-semibold">Loading indicator</h1>
      <p className="text-sm text-brand-neutral-650">The logo is 20px tall; the dots build to three and clear one at a time (2.4s cycle).</p>
      <section className="rounded-xl border border-brand-neutral-200 bg-white p-6"><Loading /></section>
      <section className="rounded-xl border border-brand-neutral-200 bg-brand-neutral-100 p-6"><Loading label="Loading ads" /></section>
      <section className="rounded-xl border border-brand-neutral-200 bg-white p-6">
        <p className="mb-2 text-xs text-brand-neutral-650">Fading out</p>
        <Loading leaving />
      </section>
    </main>
  );
}
