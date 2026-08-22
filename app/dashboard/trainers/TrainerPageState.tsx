import Link from 'next/link';
import type { TrainerLoadError } from './useTrainer';

export function TrainerPageLoading({ label = 'Loading trainer…' }: { label?: string }) {
  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm" role="status">
      <div className="animate-pulse space-y-5">
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="h-4 w-72 max-w-full rounded bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-20 rounded-lg bg-gray-100" />)}
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-gray-500">{label}</p>
    </div>
  );
}

export function TrainerPageError({ error, onRetry }: { error: Exclude<TrainerLoadError, null>; onRetry: () => void }) {
  const notFound = error === 'not-found';
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${notFound ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
        {notFound ? '?' : '!'}
      </div>
      <h1 className="mt-4 text-xl font-bold text-gray-900">{notFound ? 'Trainer not found' : 'Trainer could not be loaded'}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {notFound
          ? 'This trainer may have been deleted or the link may be incorrect.'
          : 'Something went wrong while loading this trainer. Please try again.'}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {!notFound && (
          <button type="button" onClick={onRetry} className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
            Retry
          </button>
        )}
        <Link href="/dashboard/trainers" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Back to Trainers
        </Link>
      </div>
    </div>
  );
}
