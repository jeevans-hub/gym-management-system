'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportSummaryCard from './ReportSummaryCard';
import ReportTable, { type ReportColumn } from './ReportTable';
import { formatReportDate, inrFormatter } from './report-format';
import type { OutstandingReportResponse, OutstandingReportRow } from './types';
import useDebouncedReportSearch from './useDebouncedReportSearch';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: OutstandingReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { membershipCount: 0, totalPrice: 0, totalPaid: 0, totalOutstanding: 0, accountingPolicy: '' } };

export default function OutstandingReport() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedReportSearch(searchInput);
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (plan.trim()) params.set('plan', plan.trim());
    return `/api/reports/outstanding-balances?${params}`;
  }, [page, plan, search, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<OutstandingReportRow>> = [
    { key: 'id', heading: 'Member ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.memberId}</span> },
    { key: 'member', heading: 'Member', cell: (row) => <span className="font-bold text-slate-900">{row.memberName}</span> },
    { key: 'plan', heading: 'Plan', cell: (row) => row.plan },
    { key: 'status', heading: 'Membership Status', cell: (row) => <ReportStatusBadge status={row.membershipStatus} /> },
    { key: 'price', heading: 'Purchase Price', cell: (row) => inrFormatter.format(row.priceAtPurchase) },
    { key: 'paid', heading: 'Total Paid', cell: (row) => inrFormatter.format(row.totalPaid) },
    { key: 'remaining', heading: 'Remaining Balance', cell: (row) => <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 font-black text-rose-700">{inrFormatter.format(row.remainingBalance)}</span> },
    { key: 'end', heading: 'End Date', cell: (row) => formatReportDate(row.endDate) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ReportSummaryCard label="Outstanding Records" value={data.summary.membershipCount} tone="amber" loading={loading} /><ReportSummaryCard label="Purchase Value" value={inrFormatter.format(data.summary.totalPrice)} tone="blue" loading={loading} /><ReportSummaryCard label="Paid to Date" value={inrFormatter.format(data.summary.totalPaid)} tone="emerald" loading={loading} /><ReportSummaryCard label="Total Outstanding" value={inrFormatter.format(data.summary.totalOutstanding)} tone="rose" loading={loading} /></div>
      <ReportPanel title="Outstanding Balances" description="Derived from historical membership purchase prices and non-refunded paid records; balances are never calculated as client-side financial truth." filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
          <label className="text-sm font-bold text-slate-700">Search balances<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Member ID, member or plan" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-bold text-slate-700">Membership status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label>
          <label className="text-sm font-bold text-slate-700">Plan record ID<input value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }} placeholder="Optional exact plan ID" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
      }>
        {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><ReportTable caption="Outstanding balances report" columns={columns} rows={data.rows} rowKey={(row, index) => `${row.memberId}-${row.endDate}-${index}`} loading={loading} emptyTitle="No outstanding balances" emptyMessage="Every matching membership is fully paid, or no memberships match these filters." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="balances" onPageChange={setPage} /></>}
      </ReportPanel>
    </div>
  );
}
