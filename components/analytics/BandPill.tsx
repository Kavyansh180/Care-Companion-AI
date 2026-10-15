import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { RiskBand } from "@/lib/ml-types";

// Risk band as icon + word, never colour alone. High = missed tokens, moderate = pending, low = taken.
const bandStyle = {
  high: { Icon: AlertTriangle, label: "High", tone: "bg-missed-bg text-missed-fg border-missed-border" },
  moderate: { Icon: AlertCircle, label: "Moderate", tone: "bg-pending-bg text-pending-fg border-pending-border" },
  low: { Icon: CheckCircle2, label: "Low", tone: "bg-taken-bg text-taken-fg border-taken-border" },
} as const;

export default function BandPill({ band }: { band: RiskBand }) {
  const { Icon, label, tone } = bandStyle[band];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${tone}`}>
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}
