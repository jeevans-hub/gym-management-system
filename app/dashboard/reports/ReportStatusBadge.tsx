export default function ReportStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized === 'active' || normalized === 'paid' || normalized === 'checked-in'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : normalized === 'cancelled' || normalized === 'refunded'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : normalized === 'expired'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : normalized === 'checked-out'
            ? 'border-blue-200 bg-blue-50 text-blue-800'
            : 'border-slate-200 bg-slate-50 text-slate-700';

  const label = normalized.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>{label}</span>;
}
