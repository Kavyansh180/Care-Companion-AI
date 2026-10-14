import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type NoticeTone = "info" | "success" | "warning" | "error";

const config = {
  info: { Icon: Info, box: "bg-primary-soft border-primary-text/30 text-fg", icon: "text-primary-text" },
  success: { Icon: CheckCircle2, box: "bg-taken-bg border-taken-border text-taken-fg", icon: "text-taken-fg" },
  warning: { Icon: AlertTriangle, box: "bg-pending-bg border-pending-border text-pending-fg", icon: "text-pending-fg" },
  error: { Icon: AlertCircle, box: "bg-missed-bg border-missed-border text-missed-fg", icon: "text-missed-fg" },
} as const;

export default function Notice({
  tone = "info",
  title,
  children,
  action,
  className = "",
}: {
  tone?: NoticeTone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { Icon, box, icon } = config[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border p-4 ${box} ${className}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${icon}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-base">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
