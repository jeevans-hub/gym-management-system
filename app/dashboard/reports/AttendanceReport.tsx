'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportTable, { type ReportColumn } from './ReportTable';
import { formatGymDate, formatReportDateTime } from './report-format';
import type { AttendanceReportResponse, AttendanceReportRow } from './types';
import useDebouncedReportSearch from './useDebouncedReportSearch';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: AttendanceReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { totalAttendanceRecords: 0, uniqueMembers: 0, checkedIn: 0, checkedOut: 0 } };

export default function AttendanceReport({ rangeQueryString }: { rangeQueryString: string }) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedReportSearch(searchInput);
  const [memberInput, setMemberInput] = useState('');
  const member = useDebouncedReportSearch(memberInput);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams(rangeQueryString);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (member) params.set('member', member);
    if (status !== 'all') params.set('status', status);
    return `/api/reports/attendance?${params}`;
  }, [member, page, rangeQueryString, search, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<AttendanceReportRow>> = [
    { key: 'date', heading: 'Gym Date', cell: (row) => <span className="font-semibold text-slate-900">{formatGymDate(row.gymDate)}</span> },
    { key: 'id', heading: 'Member ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.memberId}</span> },
    { key: 'name', heading: 'Member', cell: (row) => <span className="font-bold text-slate-900">{row.memberName}</span> },
    { key: 'checkin', heading: 'Check-in (IST)', cell: (row) => formatReportDateTime(row.checkIn) },
    { key: 'checkout', heading: 'Check-out (IST)', cell: (row) => formatReportDateTime(row.checkOut) },
    { key: 'status', heading: 'Status', cell: (row) => <ReportStatusBadge status={row.status} /> },
  ];

  return (
    <ReportPanel title="Attendance Report" description="Gym-day attendance and check-in activity with every operational time rendered explicitly in IST." filters={
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_200px]">
        <label className="text-sm font-bold text-slate-700">Search attendance<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Member ID, name or phone" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="text-sm font-bold text-slate-700">Exact Member ID<input value={memberInput} onChange={(event) => { setMemberInput(event.target.value.toUpperCase()); setPage(1); }} placeholder="GYM-000001" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option></select></label>
      </div>
    }>
      {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 text-xs font-bold"><span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">Records {data.summary.totalAttendanceRecords}</span><span className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">Unique Members {data.summary.uniqueMembers}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Checked In {data.summary.checkedIn}</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Checked Out {data.summary.checkedOut}</span></div><ReportTable caption="Attendance report with IST times" columns={columns} rows={data.rows} rowKey={(row, index) => `${row.memberId}-${row.gymDate}-${index}`} loading={loading} emptyTitle="No attendance found" emptyMessage="No attendance records match this range and filter combination." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="attendance records" onPageChange={setPage} /></>}
    </ReportPanel>
  );
}
