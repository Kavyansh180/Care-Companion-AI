import { Loader2 } from "lucide-react";

export default function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-24 text-fg-muted">
      <Loader2 aria-hidden="true" className="size-8 motion-safe:animate-spin" />
      <span>{label}</span>
    </div>
  );
}
