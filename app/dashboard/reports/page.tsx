import ReportsPageClient from './ReportsPageClient';
import { isValidGymDate } from './report-format';
import type { ReportRangePreset, ReportTab } from './types';

const tabs: ReportTab[] = ['overview', 'members', 'memberships', 'attendance', 'payments', 'outstanding', 'trainers'];
const presets: ReportRangePreset[] = ['today', 'this-week', 'this-month', 'custom'];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; range?: string; from?: string; to?: string }>;
}) {
  const query = await searchParams;
  const tab = tabs.includes(query.report as ReportTab) ? query.report as ReportTab : 'overview';
  const preset = presets.includes(query.range as ReportRangePreset) ? query.range as ReportRangePreset : 'this-month';
  const from = query.from && isValidGymDate(query.from) ? query.from : '';
  const to = query.to && isValidGymDate(query.to) ? query.to : '';

  return <ReportsPageClient initialTab={tab} initialPreset={preset} initialFrom={from} initialTo={to} />;
}
