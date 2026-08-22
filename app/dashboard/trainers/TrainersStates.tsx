import type { TrainerStatusFilter } from './types';

export function TrainersLoadingState() {
  return (
    <div className="p-5" role="status" aria-live="polite">
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-4 gap-4 rounded-lg border border-gray-100 p-4">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="hidden h-4 rounded bg-gray-200 sm:block" />
            <div className="hidden h-4 rounded bg-gray-200 sm:block" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-medium text-gray-500">Loading trainers…</p>
    </div>
  );
}

export function TrainersEmptyState({
  search,
  status,
  specialization,
}: {
  search: string;
  status: TrainerStatusFilter;
  specialization: string;
}) {
  const filtered = Boolean(search || status !== 'all' || specialization);
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">T</div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        {filtered ? 'No trainers match these filters' : 'No trainers yet'}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
        {filtered
          ? 'Try a different search term, status or specialization.'
          : 'Your trainer directory is ready. Use Add Trainer to create the first profile.'}
      </p>
    </div>
  );
}

export function TrainersErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-5 py-14 text-center" role="alert">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600">!</div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">Trainers could not be loaded</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
        Something went wrong while loading the directory. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
