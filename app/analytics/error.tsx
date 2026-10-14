"use client"; // Error boundaries must be Client Components

import Notice from "@/components/ui/Notice";
import { buttonClass } from "@/components/ui/styles";

export default function AnalyticsError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Notice
        tone="error"
        title="The analytics page could not be loaded"
        action={
          <button type="button" onClick={() => unstable_retry()} className={buttonClass("primary", "md")}>
            Try again
          </button>
        }
      >
        The demo data files could not be read or are not in the expected format. If the problem continues, regenerate them with{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 text-sm">ml/.venv/bin/python ml/generate_synthetic_data.py</code>.
      </Notice>
    </div>
  );
}
