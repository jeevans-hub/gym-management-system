'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGymDateKey } from '@/lib/attendance-dates';
import AttendancePagination from './AttendancePagination';
import AttendanceRecordsList from './AttendanceRecordsList';
import CheckInDialog from './CheckInDialog';
import CheckOutDialog from './CheckOutDialog';
import { formatGymDate, formatGymTime, memberName } from './attendance-format';
import type { AttendanceRecord, AttendanceResponse, AttendanceStatus } from './types';

const PAGE_SIZE = 8;
type AttendanceMode = 'today' | 'history';
type HistoryDateMode = 'exact' | 'range';

export default function AttendancePageClient({ initialSearch = '' }: { initialSearch?: string }) {
  const router = useRouter();
  const gymDate = useMemo(() => getGymDateKey(), []);
  const [mode, setMode] = useState<AttendanceMode>('today');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentRecords, setCurrentRecords] = useState<AttendanceRecord[]>([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [memberFilter, setMemberFilter] = useState('');
  const [status, setStatus] = useState<'all' | AttendanceStatus>('all');
  const [historyDateMode, setHistoryDateMode] = useState<HistoryDateMode>('exact');
  const [exactDate, setExactDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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

  const invalidRange = Boolean(
    historyDateMode === 'range' && fromDate && toDate && fromDate > toDate
  );
  const displayedError = invalidRange ? 'From date cannot be after to date.' : error;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (invalidRange) {
      return;
    }

    const controller = new AbortController();
    async function loadAttendance() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (mode === 'today') params.set('date', gymDate);
      if (mode === 'history') {
        if (historyDateMode === 'exact' && exactDate) params.set('date', exactDate);
        if (historyDateMode === 'range') {
          if (fromDate) params.set('from', fromDate);
          if (toDate) params.set('to', toDate);
        }
        if (memberFilter.trim()) params.set('member', memberFilter.trim());
      }
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);

      try {
        const requests: Promise<Response>[] = [
          fetch(`/api/attendance?${params}`, { signal: controller.signal }),
        ];
        if (mode === 'today') {
          const currentParams = new URLSearchParams({
            date: gymDate,
            status: 'checked-in',
            page: '1',
            limit: '100',
          });
          requests.push(fetch(`/api/attendance?${currentParams}`, { signal: controller.signal }));
        }

        const responses = await Promise.all(requests);
        if (responses.some((response) => response.status === 401)) {
          router.replace('/login');
          return;
        }
        if (responses.some((response) => !response.ok)) throw new Error();

        const listData = (await responses[0].json()) as AttendanceResponse;
        setRecords(listData.attendance);
        setTotal(listData.total);
        setTotalPages(listData.totalPages);
        if (mode === 'today' && responses[1]) {
          const currentData = (await responses[1].json()) as AttendanceResponse;
          setCurrentRecords(currentData.attendance);
        }
        if (listData.totalPages > 0 && page > listData.totalPages) setPage(listData.totalPages);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setError(
            mode === 'today'
              ? 'Today’s attendance could not be loaded. Please try again.'
              : 'Attendance history could not be loaded. Please try again.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAttendance();
    return () => controller.abort();
  }, [exactDate, fromDate, gymDate, historyDateMode, invalidRange, memberFilter, mode, page, reloadKey, router, search, status, toDate]);

  function changeMode(nextMode: AttendanceMode) {
    setMode(nextMode);
    setPage(1);
    setError('');
    setSuccess('');
  }

  function refresh(message?: string) {
    if (message) setSuccess(message);
    setReloadKey((value) => value + 1);
  }

  function openCheckOut(record: AttendanceRecord) {
    setCheckOutRecord(record);
    setCheckOutError('');
  }

  async function confirmCheckOut() {
    if (!checkOutRecord || checkOutBusy) return;
    setCheckOutBusy(true);
    setCheckOutError('');
    try {
      const response = await fetch(
        `/api/attendance/${encodeURIComponent(checkOutRecord._id)}/check-out`,
        { method: 'POST' }
      );
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

  function clearHistoryFilters() {
    setSearchInput('');
    setSearch('');
    setMemberFilter('');
    setStatus('all');
    setExactDate('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  const hasHistoryFilters = Boolean(
    search || memberFilter || status !== 'all' || exactDate || fromDate || toDate
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Gym operations · IST</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'today'
              ? 'Check members in and out, and monitor today’s activity.'
              : 'Review paginated attendance records using IST gym dates.'}
          </p>
          {mode === 'today' && (
            <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">
              {formatGymDate(gymDate)}
            </p>
          )}
        </div>
        {mode === 'today' && (
          <button
            type="button"
            onClick={() => { setShowCheckIn(true); setSuccess(''); }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Check In Member
          </button>
        )}
      </header>

      <div role="tablist" aria-label="Attendance view" className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-100 p-1 sm:w-auto">
        {(['today', 'history'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => changeMode(value)}
            className={`flex-1 rounded-lg px-6 py-2.5 text-sm font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 sm:flex-none ${mode === value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {value}
          </button>
        ))}
      </div>

      {success && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      {mode === 'today' && (
        <section aria-labelledby="currently-checked-in" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="currently-checked-in" className="text-lg font-semibold text-gray-900">Currently Checked In</h2><p className="mt-1 text-sm text-gray-500">Members presently inside the gym.</p></div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800" aria-label={`${currentRecords.length} currently checked in`}>{currentRecords.length}</span>
          </div>
          {loading && currentRecords.length === 0 ? (
            <div role="status" aria-label="Loading currently checked in members" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}</div>
          ) : currentRecords.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"><p className="font-semibold text-gray-800">No members are currently checked in</p><p className="mt-1 text-sm text-gray-500">Use Check In Member when someone arrives.</p></div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {currentRecords.map((record) => (
                <article key={record._id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-gray-900">{memberName(record.member)}</h3><p className="mt-1 font-mono text-xs font-semibold text-blue-700">{record.member.memberId}</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-label="Currently inside" /></div>
                  <p className="mt-3 text-sm text-gray-600">Since <span className="font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</span></p>
                  <button type="button" onClick={() => openCheckOut(record)} className="mt-4 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label={`Check out ${memberName(record.member)}`}>Check Out</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="attendance-list-heading" className="space-y-4">
        <div>
          <h2 id="attendance-list-heading" className="text-xl font-bold text-gray-900">
            {mode === 'today' ? 'Today’s Attendance' : 'Attendance History'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'today'
              ? 'All check-ins recorded for the current IST gym day.'
              : 'Dates and times below always use Asia/Kolkata.'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className={`grid gap-3 ${mode === 'history' ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-[minmax(0,1fr)_13rem]'}`}>
            <label className="text-sm font-semibold text-gray-700">
              Search attendance
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Member ID, name, or phone" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            {mode === 'history' && (
              <label className="text-sm font-semibold text-gray-700">
                Member ID
                <input value={memberFilter} onChange={(event) => { setMemberFilter(event.target.value); setPage(1); }} placeholder="Exact member ID" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            )}
            <label className="text-sm font-semibold text-gray-700">
              Status
              <select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | AttendanceStatus); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="all">All statuses</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option>
              </select>
            </label>
            {mode === 'history' && (
              <label className="text-sm font-semibold text-gray-700">
                Date filter
                <select value={historyDateMode} onChange={(event) => { setHistoryDateMode(event.target.value as HistoryDateMode); setPage(1); setError(''); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="exact">Exact date</option><option value="range">Date range</option>
                </select>
              </label>
            )}
          </div>

          {mode === 'history' && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              {historyDateMode === 'exact' ? (
                <label className="block max-w-sm text-sm font-semibold text-gray-700">
                  Exact gym date
                  <input type="date" value={exactDate} onChange={(event) => { setExactDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-gray-700">From gym date<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                  <label className="text-sm font-semibold text-gray-700">To gym date<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                </div>
              )}
              {hasHistoryFilters && <button type="button" onClick={clearHistoryFilters} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear all filters</button>}
            </div>
          )}
        </div>

        {displayedError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><h3 className="font-semibold text-red-900">Unable to load attendance</h3><p className="mt-1 text-sm text-red-700">{displayedError}</p>{!invalidRange && <button type="button" onClick={() => refresh()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Try again</button>}</div>
        ) : loading ? (
          <div role="status" aria-label="Loading attendance records" className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><h3 className="font-semibold text-gray-900">No attendance records found</h3><p className="mt-2 text-sm text-gray-500">{mode === 'history' && hasHistoryFilters ? 'Try changing or clearing the history filters.' : mode === 'today' && (search || status !== 'all') ? 'Try changing the search or status filter.' : mode === 'today' ? 'Today’s check-ins will appear here.' : 'Attendance records will appear here after members check in.'}</p>{mode === 'history' && hasHistoryFilters && <button type="button" onClick={clearHistoryFilters} className="mt-4 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear filters</button>}</div>
        ) : (
          <>
            <AttendanceRecordsList records={records} showDate={mode === 'history'} onCheckOut={mode === 'today' ? openCheckOut : undefined} />
            <AttendancePagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </section>

      {showCheckIn && <CheckInDialog currentRecords={currentRecords} onClose={() => setShowCheckIn(false)} onSuccess={(attendance) => { setShowCheckIn(false); refresh(`${memberName(attendance.member)} checked in successfully.`); }} />}
      {checkOutRecord && <CheckOutDialog record={checkOutRecord} busy={checkOutBusy} error={checkOutError} onClose={() => { if (!checkOutBusy) setCheckOutRecord(null); }} onConfirm={() => void confirmCheckOut()} />}
    </div>
  );
}
