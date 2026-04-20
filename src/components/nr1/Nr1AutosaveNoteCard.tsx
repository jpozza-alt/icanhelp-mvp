"use client";

type Props = {
  title: string;
  description: string;
  statusLabel: string;
};

export function Nr1AutosaveNoteCard({ title, description, statusLabel }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {statusLabel}
        </div>
      </div>
    </section>
  );
}
