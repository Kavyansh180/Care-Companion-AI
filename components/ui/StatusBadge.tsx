import { CheckCircle2, Clock, XCircle } from "lucide-react";

export type DoseStatus = "taken" | "pending" | "missed";

const config = {
  taken: { Icon: CheckCircle2, label: "Taken", tone: "bg-taken-bg text-taken-fg border-taken-border" },
  pending: { Icon: Clock, label: "Pending", tone: "bg-pending-bg text-pending-fg border-pending-border" },
  missed: { Icon: XCircle, label: "Missed", tone: "bg-missed-bg text-missed-fg border-missed-border" },
} as const;

export default function StatusBadge({ status, className = "" }: { status: DoseStatus; className?: string }) {
  const { Icon, label, tone } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${tone} ${className}`}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}
