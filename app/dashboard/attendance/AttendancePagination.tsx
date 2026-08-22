interface AttendancePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function AttendancePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: AttendancePaginationProps) {
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Attendance pagination"
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-gray-600">
        Showing {firstRecord}–{lastRecord} of {total} record{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          aria-label="Previous attendance page"
        >
          Previous
        </button>
        <span className="px-2 text-sm text-gray-600" aria-current="page">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          aria-label="Next attendance page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
