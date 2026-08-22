export default function ReportErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <h3 className="font-bold text-red-900">Unable to load this report</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Try again</button>
    </div>
  );
}
