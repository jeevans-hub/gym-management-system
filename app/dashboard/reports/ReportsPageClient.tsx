'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import AttendanceReport from './AttendanceReport';
import MembersReport from './MembersReport';
import MembershipsReport from './MembershipsReport';
import OutstandingReport from './OutstandingReport';
import OverviewSection from './OverviewSection';
import PaymentsReport from './PaymentsReport';
import ReportDateRange from './ReportDateRange';
import ReportErrorState from './ReportErrorState';
import ReportSummaryCard from './ReportSummaryCard';
import TrainersReport from './TrainersReport';
import { inrFormatter, rangeLabel, rangeQuery, validateCustomRange } from './report-format';
import type { OverviewResponse, ReportRangePreset, ReportTab, TrendsResponse } from './types';
import useReportData from './useReportData';

const tabs: Array<{ value: ReportTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'members', label: 'Members' },
  { value: 'memberships', label: 'Memberships' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payments', label: 'Payments' },
  { value: 'outstanding', label: 'Outstanding Balances' },
  { value: 'trainers', label: 'Trainers' },
];

const initialOverview: OverviewResponse = {
  range: { preset: 'this-month', from: '', to: '', days: 0, timeZone: 'Asia/Kolkata', boundaries: 'inclusive gym dates' },
  members: { totalMembers: 0, activeMembers: 0, inactiveMembers: 0, newMembersInRange: 0 },
  memberships: { activeMemberships: 0, expiredMemberships: 0, cancelledMemberships: 0, expiringSoon: 0, expiringSoonWindowDays: 7 },
  attendance: { attendanceCountInRange: 0, uniqueMembersAttended: 0, currentlyCheckedIn: 0 },
  payments: { grossPaidInRange: 0, refundedAmountInRange: 0, netRevenueInRange: 0, accountingPolicy: '' },
  trainers: { totalTrainers: 0, activeTrainers: 0, inactiveTrainers: 0 },
};

const initialTrends: TrendsResponse = {
  range: initialOverview.range,
  interval: 'daily',
  points: [],
  accountingPolicy: '',
};

export default function ReportsPageClient({
  initialTab,
  initialPreset,
  initialFrom,
  initialTo,
}: {
  initialTab: ReportTab;
  initialPreset: ReportRangePreset;
  initialFrom: string;
  initialTo: string;
}) {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);
  const [preset, setPreset] = useState<ReportRangePreset>(initialPreset);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const rangeError = validateCustomRange(preset, from, to);
  const rangeParams = useMemo(() => rangeQuery(preset, from, to), [from, preset, to]);
  const rangeQueryString = rangeParams.toString();
  const validRange = !rangeError;
  const overviewUrl = validRange ? `/api/reports/overview?${rangeQueryString}` : null;
  const trendUrl = validRange ? `/api/reports/trends?${rangeQueryString}` : null;
  const overview = useReportData(overviewUrl, initialOverview);
  const trends = useReportData(trendUrl, initialTrends);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') params.set('report', activeTab);
    if (preset !== 'this-month') params.set('range', preset);
    if (preset === 'custom') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    const query = params.toString();
    window.history.replaceState(null, '', `/dashboard/reports${query ? `?${query}` : ''}`);
  }, [activeTab, from, preset, to]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    setActiveTab(tabs[next].value);
    buttons[next]?.focus();
  }

  const cards = [
    { label: 'Total Members', value: overview.data.members.totalMembers, hint: `${overview.data.members.newMembersInRange} joined in range`, tone: 'blue' as const },
    { label: 'Active Members', value: overview.data.members.activeMembers, hint: `${overview.data.members.inactiveMembers} inactive`, tone: 'emerald' as const },
    { label: 'Active Memberships', value: overview.data.memberships.activeMemberships, hint: 'Current persisted records', tone: 'violet' as const },
    { label: 'Expiring Soon', value: overview.data.memberships.expiringSoon, hint: `Next ${overview.data.memberships.expiringSoonWindowDays} days`, tone: 'amber' as const },
    { label: 'Attendance in Range', value: overview.data.attendance.attendanceCountInRange, hint: `${overview.data.attendance.currentlyCheckedIn} currently checked in`, tone: 'cyan' as const },
    { label: 'Unique Attendees', value: overview.data.attendance.uniqueMembersAttended, hint: 'Distinct members in range', tone: 'blue' as const },
    { label: 'Net Revenue', value: inrFormatter.format(overview.data.payments.netRevenueInRange), hint: 'Refunds excluded', tone: 'emerald' as const },
    { label: 'Active Trainers', value: overview.data.trainers.activeTrainers, hint: `${overview.data.trainers.totalTrainers} total trainers`, tone: 'violet' as const },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 overflow-x-clip pb-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700">Business intelligence · INR · IST</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Reports & Analytics</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Monitor gym operations, financial health, memberships, attendance, and team activity from live source records.</p>
        </div>
        <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{rangeLabel(preset, from, to)} · IST</span>
      </header>

      <ReportDateRange preset={preset} from={from} to={to} error={rangeError} onPresetChange={setPreset} onFromChange={setFrom} onToChange={setTo} />

      {validRange && (overview.error ? <ReportErrorState message={overview.error} onRetry={overview.retry} /> : (
        <section aria-labelledby="overview-metrics-heading">
          <h2 id="overview-metrics-heading" className="sr-only">Overview analytics</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <ReportSummaryCard key={card.label} {...card} loading={overview.loading} />)}</div>
        </section>
      ))}

      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <div role="tablist" aria-label="Report sections" className="flex min-w-max gap-1">
          {tabs.map((tab, index) => (
            <button key={tab.value} id={`report-tab-${tab.value}`} type="button" role="tab" aria-selected={activeTab === tab.value} aria-controls={`report-panel-${tab.value}`} tabIndex={activeTab === tab.value ? 0 : -1} onKeyDown={(event) => handleTabKeyDown(event, index)} onClick={() => setActiveTab(tab.value)} className={`rounded-lg px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${activeTab === tab.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div id={`report-panel-${activeTab}`} role="tabpanel" aria-labelledby={`report-tab-${activeTab}`} tabIndex={0} className="min-w-0 focus:outline-none">
        {!validRange ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center"><h2 className="font-bold text-amber-900">Complete the reporting period</h2><p className="mt-2 text-sm text-amber-700">Correct the custom date range above to load report data.</p></div> : activeTab === 'overview' ? <OverviewSection data={trends.data} loading={trends.loading} error={trends.error} onRetry={trends.retry} /> : activeTab === 'members' ? <MembersReport rangeQueryString={rangeQueryString} /> : activeTab === 'memberships' ? <MembershipsReport rangeQueryString={rangeQueryString} /> : activeTab === 'attendance' ? <AttendanceReport rangeQueryString={rangeQueryString} /> : activeTab === 'payments' ? <PaymentsReport rangeQueryString={rangeQueryString} /> : activeTab === 'outstanding' ? <OutstandingReport /> : <TrainersReport />}
      </div>
    </div>
  );
}
