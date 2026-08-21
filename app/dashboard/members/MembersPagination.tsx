interface MembersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export default function MembersPagination({
  page,
  totalPages,
  total,
  limit,
  loading,
  onPageChange,
}: MembersPaginationProps) {
  const displayTotalPages = Math.max(totalPages, 1);
  const firstRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-gray-500">
        {total === 0 ? 'No members to show' : `Showing ${firstRecord}–${lastRecord} of ${total} members`}
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="whitespace-nowrap text-sm font-medium text-gray-600">
          Page {Math.min(page, displayTotalPages)} of {displayTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0 || loading}
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
