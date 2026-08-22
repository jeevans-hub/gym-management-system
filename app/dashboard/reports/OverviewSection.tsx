import ReportErrorState from './ReportErrorState';
import TrendChart from './TrendChart';
import { inrFormatter } from './report-format';
import type { TrendsResponse } from './types';

function trendLabel(bucket: string): string {
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const [year, month] = bucket.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  const [year, month, day] = bucket.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function OverviewSection({ data, loading, error, onRetry }: { data: TrendsResponse; loading: boolean; error: string; onRetry: () => void }) {
  if (error) return <ReportErrorState message={error} onRetry={onRetry} />;
  if (loading) return <div role="status" aria-label="Loading trend charts" className="grid gap-5 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200 lg:col-span-2" /></div>;

  const labels = data.points.map((point) => trendLabel(point.bucket));
  return (
    <section aria-labelledby="trend-analytics-heading" className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">Movement over time</p>
        <h2 id="trend-analytics-heading" className="mt-1 text-xl font-black text-slate-950">Operational trends</h2>
        <p className="mt-1 text-sm text-slate-500">Daily activity for shorter ranges and monthly activity when requested by the API.</p>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <TrendChart title="New Members" description="Members whose joining date falls in the selected IST range." kind="bar" color="#2563eb" points={data.points.map((point, index) => ({ label: labels[index], value: point.newMembers }))} valueFormatter={(value) => String(Math.round(value))} />
        <TrendChart title="Attendance" description="Attendance records by inclusive gym date in Asia/Kolkata." kind="bar" color="#0891b2" points={data.points.map((point, index) => ({ label: labels[index], value: point.attendanceCount }))} valueFormatter={(value) => String(Math.round(value))} />
        <div className="min-w-0 lg:col-span-2"><TrendChart title="Net Revenue" description="Paid payment records only; refunded records do not increase revenue." color="#059669" points={data.points.map((point, index) => ({ label: labels[index], value: point.netRevenue }))} valueFormatter={(value) => inrFormatter.format(value)} /></div>
      </div>
    </section>
  );
}
