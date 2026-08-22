export default function ReportEmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? 'px-4 py-10' : 'px-6 py-16'}`}>
      <span aria-hidden="true" className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-400">◇</span>
      <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>
    </div>
  );
}
