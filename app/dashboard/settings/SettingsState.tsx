export function SettingsLoadingState({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true" />
      <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}

export function SettingsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-900">Unable to load this section</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500">
        Try again
      </button>
    </div>
  );
}
