import type { ReportRangePreset } from './types';

const presets: Array<{ value: ReportRangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportDateRange({
  preset,
  from,
  to,
  error,
  onPresetChange,
  onFromChange,
  onToChange,
}: {
  preset: ReportRangePreset;
  from: string;
  to: string;
  error: string;
  onPresetChange: (value: ReportRangePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <section aria-labelledby="report-range-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 id="report-range-heading" className="text-sm font-bold text-slate-900">Reporting period</h2>
          <p className="mt-1 text-xs text-slate-500">All operational dates use Asia/Kolkata and inclusive gym days.</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <fieldset>
            <legend className="sr-only">Choose reporting period</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:flex" aria-label="Reporting period presets">
              {presets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={preset === item.value}
                  onClick={() => onPresetChange(item.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    preset === item.value
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          {preset === 'custom' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(event) => onFromChange(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(event) => onToChange(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
