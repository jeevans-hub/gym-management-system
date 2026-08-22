import type { ReactNode } from 'react';

export default function ReportPanel({
  title,
  description,
  filters,
  children,
}: {
  title: string;
  description: string;
  filters: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-5">
        <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5">{filters}</div>
      {children}
    </section>
  );
}
