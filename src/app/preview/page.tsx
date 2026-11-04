import { LinkedInFeed } from "@/components/mockups/LinkedInFeed";

const SIZES = [
  { width: 1200, height: 1200 },
  { width: 1200, height: 628 },
  { width: 720, height: 900 },
];

export default function Preview() {
  return (
    <main className="mx-auto flex max-w-6xl flex-wrap gap-6 p-8">
      {SIZES.map((s) => (
        <LinkedInFeed
          key={`${s.width}x${s.height}`}
          {...s}
          intro="Create surveys that feel like your brand. Our powerful tools let you customize every detail to build trust, boost responses, and strengthen loyalty."
          headline="Tailor every survey detail—from the first invite to the final question"
        />
      ))}
    </main>
  );
}
