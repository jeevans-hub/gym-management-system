export default function ReportPagination({
  page,
  totalPages,
  total,
  limit,
  loading,
  itemLabel,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading: boolean;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const displayedPages = Math.max(totalPages, 1);

  return (
    <nav aria-label={`${itemLabel} report pagination`} className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">{total ? `Showing ${first}–${last} of ${total} ${itemLabel}` : `No ${itemLabel} to show`}</p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label={`Previous ${itemLabel} page`} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        <span className="whitespace-nowrap text-sm font-semibold text-slate-600">Page {Math.min(page, displayedPages)} of {displayedPages}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || totalPages === 0 || loading} aria-label={`Next ${itemLabel} page`} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </div>
    </nav>
  );
}
