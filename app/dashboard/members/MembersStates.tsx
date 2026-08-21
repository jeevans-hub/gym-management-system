import type { StatusFilter } from './types';

export function MembersLoadingState() {
  return (
    <div className="p-5" role="status" aria-live="polite">
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-4 gap-4 rounded-lg border border-gray-100 p-4">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="hidden h-4 rounded bg-gray-200 sm:block" />
            <div className="hidden h-4 rounded bg-gray-200 sm:block" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-medium text-gray-500">Loading members…</p>
    </div>
  );
}

export function MembersEmptyState({ search, status }: { search: string; status: StatusFilter }) {
  let title = 'No members yet';
  let message = 'Your member directory is ready. Use Add Member to create the first profile.';

  if (search && status !== 'all') {
    title = 'No members match these filters';
    message = 'Try a different search term or select another status.';
  } else if (search) {
    title = 'No matching members';
    message = `No results were found for “${search}”. Check the spelling or try another detail.`;
  } else if (status !== 'all') {
    title = `No ${status} members`;
    message = `There are currently no members with ${status} status.`;
  }

  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">M</div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">{message}</p>
    </div>
  );
}

export function MembersErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-5 py-14 text-center" role="alert">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600">!</div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">Members could not be loaded</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
        Something went wrong while loading the directory. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        Retry
      </button>
    </div>
  );
}
