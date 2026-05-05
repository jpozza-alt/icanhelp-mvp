import type { ReactNode } from "react";

type PgrSectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function PgrSectionCard({
  title,
  description,
  children,
  className = "",
}: PgrSectionCardProps) {
  const classes = [
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          ) : null}
          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
        </header>
      )}

      {children}
    </section>
  );
}
