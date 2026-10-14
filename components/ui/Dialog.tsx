"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { iconButtonClass } from "./styles";

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  role = "dialog",
  className = "",
}: {
  open: boolean;
  onClose?: () => void; // omit for dialogs that must be answered: Escape is then ignored
  title: string;
  description?: string;
  children: React.ReactNode;
  role?: "dialog" | "alertdialog";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault(); // React state stays the source of truth
        onClose?.();
      }}
      // Chrome closes a dialog on a repeated Escape without a cancelable event; keep state in sync.
      onClose={() => {
        if (!open) return;
        if (onClose) onClose();
        else ref.current?.showModal();
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-[#24332F]/45 ${className}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-fg-muted">
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className={`${iconButtonClass()} -mr-2 -mt-2 shrink-0`}>
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}
