'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportTable, { type ReportColumn } from './ReportTable';
import { formatReportDate, inrFormatter } from './report-format';
import type { MembershipReportRow, MembershipsReportResponse } from './types';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: MembershipsReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { active: 0, expired: 0, cancelled: 0, expiringSoon: 0, expiringSoonWindowDays: 7 } };

export default function MembershipsReport({ rangeQueryString }: { rangeQueryString: string }) {
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams(rangeQueryString);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (status !== 'all') params.set('status', status);
    if (plan.trim()) params.set('plan', plan.trim());
    if (expiringSoon) params.set('expiringWithinDays', '7');
    return `/api/reports/memberships?${params}`;
  }, [expiringSoon, page, plan, rangeQueryString, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<MembershipReportRow>> = [
    { key: 'id', heading: 'Member ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.memberId}</span> },
    { key: 'member', heading: 'Member', cell: (row) => <span className="font-bold text-slate-900">{row.memberName}</span> },
    { key: 'plan', heading: 'Plan', cell: (row) => <span className="font-semibold text-slate-800">{row.plan}</span> },
    { key: 'start', heading: 'Start Date', cell: (row) => formatReportDate(row.startDate) },
    { key: 'end', heading: 'End Date', cell: (row) => formatReportDate(row.endDate) },
    { key: 'status', heading: 'Status', cell: (row) => <ReportStatusBadge status={row.status} /> },
    { key: 'price', heading: 'Purchase Price', cell: (row) => <span className="font-bold text-slate-900">{inrFormatter.format(row.priceAtPurchase)}</span> },
  ];

  return (
    <ReportPanel title="Memberships Report" description="Historical membership records use their authoritative purchase price and persisted lifecycle status." filters={
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)_auto] xl:items-end">
        <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setExpiringSoon(false); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label>
        <label className="text-sm font-bold text-slate-700">Plan record ID<input value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }} placeholder="Optional exact plan ID" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700"><input type="checkbox" checked={expiringSoon} onChange={(event) => { const checked = event.target.checked; setExpiringSoon(checked); if (checked) setStatus('active'); setPage(1); }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Expiring in 7 days</label>
      </div>
    }>
      {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 text-xs font-bold"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Active {data.summary.active}</span><span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">Expired {data.summary.expired}</span><span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">Cancelled {data.summary.cancelled}</span><span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">Expiring Soon {data.summary.expiringSoon}</span></div><ReportTable caption="Memberships report" columns={columns} rows={data.rows} rowKey={(row, index) => `${row.memberId}-${row.startDate}-${index}`} loading={loading} emptyTitle="No memberships found" emptyMessage="No membership records match this range and filter combination." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="memberships" onPageChange={setPage} /></>}
    </ReportPanel>
  );
}
