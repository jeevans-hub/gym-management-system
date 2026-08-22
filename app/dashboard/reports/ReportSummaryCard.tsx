export default function ReportSummaryCard({
  label,
  value,
  hint,
  tone = 'blue',
  loading = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';
  loading?: boolean;
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  };

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          {loading ? (
            <div role="status" aria-label={`Loading ${label}`} className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950" title={String(value)}>{value}</p>
          )}
          {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
        </div>
        <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-black ring-1 ${tones[tone]}`}>↗</span>
      </div>
    </article>
  );
}
