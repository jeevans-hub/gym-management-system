'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaymentStatusBadge from './PaymentStatusBadge';
import PaymentsPagination from './PaymentsPagination';
import {
  formatPaymentDate,
  inrFormatter,
  paymentMemberName,
  paymentMethodLabel,
} from './payment-format';
import type { PaymentMethod, PaymentRecord, PaymentsResponse, PaymentStatus } from './types';

const PAGE_SIZE = 8;
type DateMode = 'exact' | 'range';

export default function PaymentsPageClient({
  initialMember,
  initialMembership,
  initialDate,
  initialFrom,
  initialTo,
  recorded,
}: {
  initialMember: string;
  initialMembership: string;
  initialDate: string;
  initialFrom: string;
  initialTo: string;
  recorded: boolean;
}) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [member, setMember] = useState(initialMember);
  const [membership, setMembership] = useState(initialMembership);
  const [method, setMethod] = useState<'all' | PaymentMethod>('all');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [dateMode, setDateMode] = useState<DateMode>(initialFrom || initialTo ? 'range' : 'exact');
  const [exactDate, setExactDate] = useState(initialDate);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const invalidRange = Boolean(dateMode === 'range' && fromDate && toDate && fromDate > toDate);
  const displayedError = invalidRange ? 'From date cannot be after to date.' : error;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    async function loadPayments() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (member.trim()) params.set('member', member.trim());
      if (membership.trim()) params.set('membership', membership.trim());
      if (method !== 'all') params.set('paymentMethod', method);
      if (status !== 'all') params.set('status', status);
      if (dateMode === 'exact' && exactDate) params.set('date', exactDate);
      if (dateMode === 'range') {
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
      }

      try {
        const response = await fetch(`/api/payments?${params}`, { signal: controller.signal });
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) throw new Error();
        const data = (await response.json()) as PaymentsResponse;
        setPayments(data.payments);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.totalPages > 0 && page > data.totalPages) setPage(data.totalPages);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setError('Payment history could not be loaded. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadPayments();
    return () => controller.abort();
  }, [dateMode, exactDate, fromDate, invalidRange, member, membership, method, page, reloadKey, router, search, status, toDate]);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setMember('');
    setMembership('');
    setMethod('all');
    setStatus('all');
    setExactDate('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  const filtered = Boolean(search || member || membership || method !== 'all' || status !== 'all' || exactDate || fromDate || toDate);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Financial management · INR · IST</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Record member payments, track balances, and preserve refund history.</p>
        </div>
        <Link href="/dashboard/payments/new" className="rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">+ Record Payment</Link>
      </header>

      {recorded && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Payment recorded successfully.</div>}

      <section aria-labelledby="payment-filters" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 id="payment-filters" className="font-semibold text-gray-900">Find payments</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-semibold text-gray-700">Search<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Member or transaction reference" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-semibold text-gray-700">Member ID<input value={member} onChange={(event) => { setMember(event.target.value); setPage(1); }} placeholder="Public member ID" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-semibold text-gray-700">Payment method<select value={method} onChange={(event) => { setMethod(event.target.value as 'all' | PaymentMethod); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank-transfer">Bank Transfer</option><option value="other">Other</option></select></label>
          <label className="text-sm font-semibold text-gray-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | PaymentStatus); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label>
          <label className="text-sm font-semibold text-gray-700">Date filter<select value={dateMode} onChange={(event) => { setDateMode(event.target.value as DateMode); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="exact">Exact date</option><option value="range">Date range</option></select></label>
          {dateMode === 'exact' ? (
            <label className="text-sm font-semibold text-gray-700">Exact gym date<input type="date" value={exactDate} onChange={(event) => { setExactDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          ) : (
            <><label className="text-sm font-semibold text-gray-700">From gym date<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-semibold text-gray-700">To gym date<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label></>
          )}
          <label className="text-sm font-semibold text-gray-700">Membership record ID<input value={membership} onChange={(event) => { setMembership(event.target.value); setPage(1); }} placeholder="Optional exact record" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        {filtered && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear all filters</button>}
      </section>

      <section aria-labelledby="payment-history" className="space-y-4">
        <div><h2 id="payment-history" className="text-xl font-bold text-gray-900">Payment History</h2><p className="mt-1 text-sm text-gray-500">Newest financial records appear first. Dates and times use Asia/Kolkata.</p></div>
        {displayedError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><h3 className="font-semibold text-red-900">Unable to load payments</h3><p className="mt-1 text-sm text-red-700">{displayedError}</p>{!invalidRange && <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Try again</button>}</div>
        ) : loading ? (
          <div role="status" aria-label="Loading payment history" className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><h3 className="font-semibold text-gray-900">No payments found</h3><p className="mt-2 text-sm text-gray-500">{filtered ? 'Try changing or clearing the filters.' : 'Recorded payments will appear here.'}</p>{filtered ? <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-700">Clear filters</button> : <Link href="/dashboard/payments/new" className="mt-4 inline-block text-sm font-semibold text-blue-700">Record the first payment →</Link>}</div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:block"><table className="w-full text-left"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Membership</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{payments.map((payment) => <tr key={payment._id} className="hover:bg-gray-50/70"><td className="px-4 py-4 text-sm text-gray-600">{formatPaymentDate(payment.paymentDate)}</td><td className="px-4 py-4"><p className="font-semibold text-gray-900">{paymentMemberName(payment.member)}</p><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{payment.member.memberId}</p></td><td className="px-4 py-4"><p className="text-sm font-semibold text-gray-900">{payment.membership.plan.name}</p><p className="mt-1 text-xs capitalize text-gray-500">{payment.membership.status}</p></td><td className="px-4 py-4 font-bold text-gray-900">{inrFormatter.format(payment.amount)}</td><td className="px-4 py-4 text-sm text-gray-600">{paymentMethodLabel(payment.paymentMethod)}</td><td className="px-4 py-4"><PaymentStatusBadge status={payment.status} /></td><td className="max-w-44 truncate px-4 py-4 text-sm text-gray-600" title={payment.transactionReference}>{payment.transactionReference || '—'}</td><td className="px-4 py-4 text-right"><Link href={`/dashboard/payments/${encodeURIComponent(payment._id)}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">View</Link></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 xl:hidden">{payments.map((payment) => <article key={payment._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-gray-900">{inrFormatter.format(payment.amount)}</p><p className="mt-1 text-sm text-gray-500">{formatPaymentDate(payment.paymentDate)}</p></div><PaymentStatusBadge status={payment.status} /></div><div className="mt-4 border-t border-gray-100 pt-4"><h3 className="font-semibold text-gray-900">{paymentMemberName(payment.member)}</h3><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{payment.member.memberId}</p><p className="mt-2 text-sm text-gray-600">{payment.membership.plan.name} · {paymentMethodLabel(payment.paymentMethod)}</p>{payment.transactionReference && <p className="mt-2 break-words text-xs text-gray-500">Reference: {payment.transactionReference}</p>}<Link href={`/dashboard/payments/${encodeURIComponent(payment._id)}`} className="mt-4 inline-block w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-center text-sm font-semibold text-blue-700">View Payment</Link></div></article>)}</div>
            <PaymentsPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
