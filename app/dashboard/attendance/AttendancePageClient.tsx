'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGymDateKey } from '@/lib/attendance-dates';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import CheckInDialog from './CheckInDialog';
import CheckOutDialog from './CheckOutDialog';
import { formatGymDate, formatGymTime, memberName } from './attendance-format';
import type { AttendanceRecord, AttendanceResponse, AttendanceStatus } from './types';

const PAGE_SIZE = 8;

export default function AttendancePageClient({ initialSearch = '' }: { initialSearch?: string }) {
  const router = useRouter();
  const gymDate = useMemo(() => getGymDateKey(), []);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentRecords, setCurrentRecords] = useState<AttendanceRecord[]>([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<'all' | AttendanceStatus>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkOutRecord, setCheckOutRecord] = useState<AttendanceRecord | null>(null);
  const [checkOutBusy, setCheckOutBusy] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAttendance() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ date: gymDate, page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      const currentParams = new URLSearchParams({ date: gymDate, status: 'checked-in', page: '1', limit: '100' });
      try {
        const [listResponse, currentResponse] = await Promise.all([
          fetch(`/api/attendance?${params}`, { signal: controller.signal }),
          fetch(`/api/attendance?${currentParams}`, { signal: controller.signal }),
        ]);
        if (listResponse.status === 401 || currentResponse.status === 401) {
          router.replace('/login');
          return;
        }
        if (!listResponse.ok || !currentResponse.ok) throw new Error();
        const [listData, currentData] = await Promise.all([
          listResponse.json() as Promise<AttendanceResponse>,
          currentResponse.json() as Promise<AttendanceResponse>,
        ]);
        setRecords(listData.attendance);
        setTotal(listData.total);
        setTotalPages(listData.totalPages);
        setCurrentRecords(currentData.attendance);
        if (listData.totalPages > 0 && page > listData.totalPages) setPage(listData.totalPages);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setError('Today’s attendance could not be loaded. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadAttendance();
    return () => controller.abort();
  }, [gymDate, page, reloadKey, router, search, status]);

  function refresh(message?: string) {
    if (message) setSuccess(message);
    setReloadKey((value) => value + 1);
  }

  async function confirmCheckOut() {
    if (!checkOutRecord || checkOutBusy) return;
    setCheckOutBusy(true);
    setCheckOutError('');
    try {
      const response = await fetch(`/api/attendance/${encodeURIComponent(checkOutRecord._id)}/check-out`, {
        method: 'POST',
      });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        if (response.status === 404) setCheckOutError('This attendance record no longer exists.');
        else if (response.status === 409) setCheckOutError('This member has already been checked out.');
        else setCheckOutError('The member could not be checked out. Please try again.');
        return;
      }
      const name = memberName(checkOutRecord.member);
      setCheckOutRecord(null);
      refresh(`${name} checked out successfully.`);
    } catch {
      setCheckOutError('The member could not be checked out. Check your connection and try again.');
    } finally {
      setCheckOutBusy(false);
    }
  }

  const firstRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Gym operations · IST</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">Check members in and out, and monitor today’s activity.</p>
          <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">{formatGymDate(gymDate)}</p>
        </div>
        <button type="button" onClick={() => { setShowCheckIn(true); setSuccess(''); }} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">+ Check In Member</button>
      </header>

      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div>}

      <section aria-labelledby="currently-checked-in" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 id="currently-checked-in" className="text-lg font-semibold text-gray-900">Currently Checked In</h2><p className="mt-1 text-sm text-gray-500">Members presently inside the gym.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800" aria-label={`${currentRecords.length} currently checked in`}>{currentRecords.length}</span></div>
        {loading && currentRecords.length === 0 ? <div role="status" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}</div>
          : currentRecords.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"><p className="font-semibold text-gray-800">No members are currently checked in</p><p className="mt-1 text-sm text-gray-500">Use Check In Member when someone arrives.</p></div>
          : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{currentRecords.map((record) => <article key={record._id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{memberName(record.member)}</h3><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{record.member.memberId}</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-label="Currently inside" /></div><p className="mt-3 text-sm text-gray-600">Since <span className="font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</span></p><button type="button" onClick={() => { setCheckOutRecord(record); setCheckOutError(''); }} className="mt-4 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label={`Check out ${memberName(record.member)}`}>Check Out</button></article>)}</div>}
      </section>

      <section aria-labelledby="todays-attendance" className="space-y-4">
        <div className="flex flex-col gap-1"><h2 id="todays-attendance" className="text-xl font-bold text-gray-900">Today’s Attendance</h2><p className="text-sm text-gray-500">All check-ins recorded for the current IST gym day.</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="text-sm font-semibold text-gray-700">Search attendance<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Member ID, name, or phone" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="text-sm font-semibold text-gray-700">Status<select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | AttendanceStatus); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option></select></label>
          </div>
        </div>

        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><h3 className="font-semibold text-red-900">Unable to load attendance</h3><p className="mt-1 text-sm text-red-700">{error}</p><button type="button" onClick={() => refresh()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
          : loading ? <div role="status" className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
          : records.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><h3 className="font-semibold text-gray-900">No attendance records found</h3><p className="mt-2 text-sm text-gray-500">{search || status !== 'all' ? 'Try changing the search or status filter.' : 'Today’s check-ins will appear here.'}</p>{(search || status !== 'all') && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setStatus('all'); setPage(1); }} className="mt-4 text-sm font-semibold text-blue-700">Clear filters</button>}</div>
          : <><div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block"><table className="w-full text-left"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Check-In</th><th className="px-5 py-3">Check-Out</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{records.map((record) => <tr key={record._id} className="hover:bg-gray-50/70"><td className="px-5 py-4"><p className="font-semibold text-gray-900">{memberName(record.member)}</p><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{record.member.memberId}</p></td><td className="px-5 py-4 text-sm text-gray-600">{record.member.phone}</td><td className="px-5 py-4 text-sm font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</td><td className="px-5 py-4 text-sm text-gray-600">{formatGymTime(record.checkOutAt)}</td><td className="px-5 py-4"><AttendanceStatusBadge status={record.status} /></td><td className="px-5 py-4 text-right">{record.status === 'checked-in' ? <button type="button" onClick={() => { setCheckOutRecord(record); setCheckOutError(''); }} className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={`Check out ${memberName(record.member)} from attendance table`}>Check Out</button> : <span className="text-sm text-gray-400">Complete</span>}</td></tr>)}</tbody></table></div>
            <div className="grid gap-3 lg:hidden">{records.map((record) => <article key={record._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{memberName(record.member)}</h3><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{record.member.memberId}</p><p className="mt-1 text-sm text-gray-500">{record.member.phone}</p></div><AttendanceStatusBadge status={record.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs font-semibold uppercase text-gray-500">Check-In</dt><dd className="mt-1 text-sm font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</dd></div><div><dt className="text-xs font-semibold uppercase text-gray-500">Check-Out</dt><dd className="mt-1 text-sm font-semibold text-gray-900">{formatGymTime(record.checkOutAt)}</dd></div></dl>{record.status === 'checked-in' && <button type="button" onClick={() => { setCheckOutRecord(record); setCheckOutError(''); }} className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white" aria-label={`Check out ${memberName(record.member)} from attendance card`}>Check Out</button>}</article>)}</div>
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">Showing {firstRecord}–{lastRecord} of {total} record{total === 1 ? '' : 's'}</p><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="px-2 text-sm text-gray-600">Page {page} of {Math.max(totalPages, 1)}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div></>}
      </section>

      {showCheckIn && <CheckInDialog currentRecords={currentRecords} onClose={() => setShowCheckIn(false)} onSuccess={(attendance) => { setShowCheckIn(false); refresh(`${memberName(attendance.member)} checked in successfully.`); }} />}
      {checkOutRecord && <CheckOutDialog record={checkOutRecord} busy={checkOutBusy} error={checkOutError} onClose={() => { if (!checkOutBusy) setCheckOutRecord(null); }} onConfirm={() => void confirmCheckOut()} />}
    </div>
  );
}
