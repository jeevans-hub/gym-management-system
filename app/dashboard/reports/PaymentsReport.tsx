'use client';

import { useMemo, useState } from 'react';
import ReportErrorState from './ReportErrorState';
import ReportPagination from './ReportPagination';
import ReportPanel from './ReportPanel';
import ReportStatusBadge from './ReportStatusBadge';
import ReportSummaryCard from './ReportSummaryCard';
import ReportTable, { type ReportColumn } from './ReportTable';
import { formatReportDateTime, inrFormatter, paymentMethodLabel } from './report-format';
import type { PaymentReportRow, PaymentsReportResponse } from './types';
import useDebouncedReportSearch from './useDebouncedReportSearch';
import useReportData from './useReportData';

const PAGE_SIZE = 10;
const initialData: PaymentsReportResponse = { rows: [], page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0, summary: { grossPaid: 0, refundedAmount: 0, netRevenue: 0, paymentCount: 0, paidCount: 0, refundedCount: 0, accountingPolicy: '' } };

export default function PaymentsReport({ rangeQueryString }: { rangeQueryString: string }) {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedReportSearch(searchInput);
  const [memberInput, setMemberInput] = useState('');
  const member = useDebouncedReportSearch(memberInput);
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const url = useMemo(() => {
    const params = new URLSearchParams(rangeQueryString);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (member) params.set('member', member);
    if (method !== 'all') params.set('method', method);
    if (status !== 'all') params.set('status', status);
    return `/api/reports/payments?${params}`;
  }, [member, method, page, rangeQueryString, search, status]);
  const { data, loading, error, retry } = useReportData(url, initialData);

  const columns: Array<ReportColumn<PaymentReportRow>> = [
    { key: 'date', heading: 'Payment Date (IST)', cell: (row) => formatReportDateTime(row.paymentDate) },
    { key: 'id', heading: 'Member ID', cell: (row) => <span className="font-mono text-xs font-bold text-blue-700">{row.memberId}</span> },
    { key: 'member', heading: 'Member', cell: (row) => <span className="font-bold text-slate-900">{row.memberName}</span> },
    { key: 'plan', heading: 'Plan', cell: (row) => row.plan },
    { key: 'amount', heading: 'Amount', cell: (row) => <span className="font-black text-slate-950">{inrFormatter.format(row.amount)}</span> },
    { key: 'method', heading: 'Method', cell: (row) => paymentMethodLabel(row.method) },
    { key: 'status', heading: 'Status', cell: (row) => <ReportStatusBadge status={row.status} /> },
    { key: 'reference', heading: 'Reference', cell: (row) => <span className="block max-w-44 truncate" title={row.transactionReference}>{row.transactionReference || '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ReportSummaryCard label="Gross Collections" value={inrFormatter.format(data.summary.grossPaid)} tone="blue" loading={loading} /><ReportSummaryCard label="Refunded" value={inrFormatter.format(data.summary.refundedAmount)} tone="rose" loading={loading} /><ReportSummaryCard label="Net Revenue" value={inrFormatter.format(data.summary.netRevenue)} tone="emerald" loading={loading} /><ReportSummaryCard label="Payment Count" value={data.summary.paymentCount} tone="violet" loading={loading} /></div>
      <ReportPanel title="Payments Report" description="Cent-safe gross, refund, and net revenue figures sourced directly from payment status." filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold text-slate-700">Search payments<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Member, plan or reference" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-bold text-slate-700">Exact Member ID<input value={memberInput} onChange={(event) => { setMemberInput(event.target.value.toUpperCase()); setPage(1); }} placeholder="GYM-000001" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-bold text-slate-700">Method<select value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank-transfer">Bank Transfer</option><option value="other">Other</option></select></label>
          <label className="text-sm font-bold text-slate-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label>
        </div>
      }>
        {error ? <div className="p-4"><ReportErrorState message={error} onRetry={retry} /></div> : <><ReportTable caption="Payments and revenue report" columns={columns} rows={data.rows} rowKey={(row, index) => `${row.memberId}-${row.paymentDate}-${index}`} loading={loading} emptyTitle="No payments found" emptyMessage="No payment records match this range and filter combination." /><ReportPagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} loading={loading} itemLabel="payments" onPageChange={setPage} /></>}
      </ReportPanel>
    </div>
  );
}
