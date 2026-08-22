export default function ReportsLoading() {
  return (
    <div role="status" aria-label="Loading reports" className="mx-auto w-full max-w-[1500px] animate-pulse space-y-6">
      <div className="h-20 max-w-2xl rounded-2xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-white shadow-sm" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 rounded-2xl bg-white shadow-sm" />)}</div>
      <div className="h-80 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}
