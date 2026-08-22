'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportTable, { type ReportColumn } from './ReportTable';
import { experienceLabel, formatReportDate } from './report-format';
import type { TrainerReportRow, TrainersReportResponse } from './types';
import useDebouncedReportSearch from './useDebouncedReportSearch';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: TrainersReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { total: 0, active: 0, inactive: 0 } };

export default function TrainersReport() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedReportSearch(searchInput);
  const [status, setStatus] = useState('all');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (specialization.trim()) params.set('specialization', specialization.trim());
    return `/api/reports/trainers?${params}`;
  }, [page, search, specialization, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<TrainerReportRow>> = [
    { key: 'id', heading: 'Trainer ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.trainerId}</span> },
    { key: 'name', heading: 'Name', cell: (row) => <span className="font-bold text-slate-900">{row.name}</span> },
    { key: 'phone', heading: 'Phone', cell: (row) => row.phone },
    { key: 'email', heading: 'Email', cell: (row) => <span className="block max-w-56 truncate" title={row.email}>{row.email || '—'}</span> },
    { key: 'specialization', heading: 'Specialization', cell: (row) => <span className="font-semibold text-slate-800">{row.specialization}</span> },
    { key: 'experience', heading: 'Experience', cell: (row) => experienceLabel(row.experienceYears) },
    { key: 'joined', heading: 'Joining Date', cell: (row) => formatReportDate(row.joiningDate) },
    { key: 'status', heading: 'Status', cell: (row) => <ReportStatusBadge status={row.status} /> },
  ];

  return (
    <ReportPanel title="Trainers Report" description="Trainer contact, experience, specialization, joining date, and operating status." filters={
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
        <label className="text-sm font-bold text-slate-700">Search trainers<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="ID, name, phone or email" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="text-sm font-bold text-slate-700">Specialization<input value={specialization} onChange={(event) => { setSpecialization(event.target.value); setPage(1); }} placeholder="Exact specialization" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      </div>
    }>
      {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 text-xs font-bold"><span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">Total {data.summary.total}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">Active {data.summary.active}</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Inactive {data.summary.inactive}</span></div><ReportTable caption="Trainers report" columns={columns} rows={data.rows} rowKey={(row) => row.trainerId} loading={loading} emptyTitle="No trainers found" emptyMessage="No trainer records match this filter combination." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="trainers" onPageChange={setPage} /></>}
    </ReportPanel>
  );
}
