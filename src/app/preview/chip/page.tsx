import { Chip } from "@/components/ui/chip";

export default function ChipPreview() {
  return (
    <main className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 p-8">
      <Chip variant="information">Information</Chip>
      <Chip variant="completed">Completed</Chip>
      <Chip variant="pending">Pending</Chip>
      <Chip variant="failed">Failed</Chip>
      <Chip variant="label">Label</Chip>
    </main>
  );
}
