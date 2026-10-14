export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-12 px-6 text-lg",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-muted",
  ghost: "text-primary-text hover:bg-primary-soft",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export function iconButtonClass(): string {
  return "inline-flex size-11 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors cursor-pointer";
}

export const cardClass = "rounded-xl border border-border bg-surface p-5 sm:p-6";
export const inputClass =
  "block w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-base text-fg";
export const labelClass = "block text-base font-semibold text-fg";
export const hintClass = "mt-1 text-sm text-fg-muted";
