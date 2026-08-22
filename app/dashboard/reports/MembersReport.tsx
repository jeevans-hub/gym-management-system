'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportTable, { type ReportColumn } from './ReportTable';
import { formatReportDate } from './report-format';
import type { MemberReportRow, MembersReportResponse } from './types';
import useDebouncedReportSearch from './useDebouncedReportSearch';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: MembersReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { active: 0, inactive: 0 } };

export default function MembersReport({ rangeQueryString }: { rangeQueryString: string }) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedReportSearch(searchInput);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams(rangeQueryString);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    return `/api/reports/members?${params}`;
  }, [page, rangeQueryString, search, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<MemberReportRow>> = [
    { key: 'id', heading: 'Member ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.memberId}</span> },
    { key: 'name', heading: 'Name', cell: (row) => <span className="font-bold text-slate-900">{row.fullName}</span> },
    { key: 'phone', heading: 'Phone', cell: (row) => row.phone },
    { key: 'email', heading: 'Email', cell: (row) => <span className="block max-w-56 truncate" title={row.email}>{row.email || '—'}</span> },
    { key: 'joined', heading: 'Joining Date', cell: (row) => formatReportDate(row.joiningDate) },
    { key: 'status', heading: 'Status', cell: (row) => <ReportStatusBadge status={row.status} /> },
    { key: 'membership', heading: 'Current Membership', cell: (row) => row.currentMembership ? <div><p className="font-semibold text-slate-800">{row.currentMembership.planName || 'Plan unavailable'}</p><p className="mt-1 text-xs text-slate-500">Until {formatReportDate(row.currentMembership.endDate)}</p></div> : '—' },
  ];

  return (
    <ReportPanel title="Members Report" description="Joining activity, contact details, status, and current membership context for the selected period." filters={
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
        <label className="text-sm font-bold text-slate-700">Search members<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="ID, name, phone or email" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div className="flex gap-2 text-xs font-bold text-slate-600"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Active {data.summary.active}</span><span className="rounded-lg bg-slate-200 px-3 py-2">Inactive {data.summary.inactive}</span></div>
      </div>
    }>
      {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><ReportTable caption="Members report" columns={columns} rows={data.rows} rowKey={(row) => row.memberId} loading={loading} emptyTitle="No members found" emptyMessage="No member joining records match this range and filter combination." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="members" onPageChange={setPage} /></>}
    </ReportPanel>
  );
}
