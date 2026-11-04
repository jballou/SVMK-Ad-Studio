import { Gallery } from "@/components/gallery/Gallery";
import { SEED_ADS } from "@/lib/ads/seed";

export const metadata = { title: "Gallery · Ad Studio" };

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Ad gallery</h1>
      <p className="text-sm text-neutral-600">Sample data. Status changes persist in this browser only until the database is connected.</p>
      <Gallery initial={SEED_ADS} />
    </main>
  );
}
