import { MetaPost } from "@/components/mockups/MetaPost";
import { MetaStory } from "@/components/mockups/MetaStory";

const copy = {
  primaryText: "Create surveys that feel like your brand. Customize every detail to build trust and boost responses.",
  headline: "Tailor every survey detail",
};

export default function MetaPreview() {
  return (
    <main className="mx-auto flex max-w-6xl flex-wrap items-start gap-6 p-8">
      <MetaPost variant="facebook" width={1080} height={1350} {...copy} />
      <MetaPost variant="instagram" width={1080} height={1080} {...copy} />
      <MetaPost variant="threads" width={1080} height={1920} {...copy} />
      <MetaStory />
    </main>
  );
}
