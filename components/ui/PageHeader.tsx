export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-primary-text">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">{title}</h1>
        {description && <div className="mt-2 text-base text-fg-muted max-w-2xl">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
