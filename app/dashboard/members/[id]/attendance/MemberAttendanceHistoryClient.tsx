'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AttendancePagination from '@/app/dashboard/attendance/AttendancePagination';
import AttendanceStatusBadge from '@/app/dashboard/attendance/AttendanceStatusBadge';
import {
  formatAttendanceGymDate,
  formatGymTime,
  memberName,
} from '@/app/dashboard/attendance/attendance-format';
import type {
  AttendanceMember,
  AttendanceRecord,
  MemberAttendanceResponse,
} from '@/app/dashboard/attendance/types';

const PAGE_SIZE = 8;

export default function MemberAttendanceHistoryClient({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [member, setMember] = useState<AttendanceMember | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const displayedError = invalidRange ? 'From date cannot be after to date.' : error;

  useEffect(() => {
    if (invalidRange) {
      return;
    }

    const controller = new AbortController();
    async function loadMemberAttendance() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      try {
        const response = await fetch(
          `/api/members/${encodeURIComponent(memberId)}/attendance?${params}`,
          { signal: controller.signal }
        );
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (response.status === 404) {
          setError('This member could not be found.');
          return;
        }
        if (!response.ok) throw new Error();

        const data = (await response.json()) as MemberAttendanceResponse;
        setMember(data.member);
        setRecords(data.attendance);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.totalPages > 0 && page > data.totalPages) setPage(data.totalPages);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setError('Attendance history could not be loaded. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadMemberAttendance();
    return () => controller.abort();
  }, [fromDate, invalidRange, memberId, page, reloadKey, router, toDate]);

  function clearDates() {
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  const backHref = `/dashboard/members/${encodeURIComponent(member?.memberId || memberId)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <Link href={backHref} className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          ← Back to Member Details
        </Link>
        <p className="mt-4 text-sm font-semibold text-blue-700">Attendance · IST</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Member Attendance History
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review this member’s attendance using Asia/Kolkata gym dates and times.
        </p>
      </header>

      {member && (
        <section aria-labelledby="member-summary-heading" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="member-summary-heading" className="text-sm font-semibold uppercase tracking-wide text-gray-500">Member summary</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{memberName(member)}</p>
              <p className="mt-1 font-mono text-sm font-semibold text-blue-700">{member.memberId}</p>
            </div>
            <p className="text-sm text-gray-600">{member.phone}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="member-attendance-filters" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 id="member-attendance-filters" className="font-semibold text-gray-900">Filter by gym date</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">
            From gym date
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            To gym date
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        {(fromDate || toDate) && (
          <button type="button" onClick={clearDates} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Clear date range
          </button>
        )}
      </section>

      <section aria-labelledby="member-attendance-records" className="space-y-4">
        <div>
          <h2 id="member-attendance-records" className="text-xl font-bold text-gray-900">Attendance records</h2>
          <p className="mt-1 text-sm text-gray-500">Newest records appear first.</p>
        </div>

        {displayedError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <h3 className="font-semibold text-red-900">Unable to load member attendance</h3>
            <p className="mt-1 text-sm text-red-700">{displayedError}</p>
            {!invalidRange && displayedError !== 'This member could not be found.' && (
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                Try again
              </button>
            )}
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading member attendance history" className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <h3 className="font-semibold text-gray-900">No attendance history found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {fromDate || toDate ? 'No records match this date range.' : 'This member has no attendance records yet.'}
            </p>
            {(fromDate || toDate) && <button type="button" onClick={clearDates} className="mt-4 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear date range</button>}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-3">Gym date</th><th className="px-4 py-3">Check-In</th><th className="px-4 py-3">Check-Out</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatAttendanceGymDate(record.attendanceDate)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatGymTime(record.checkOutAt)}</td>
                      <td className="px-4 py-4"><AttendanceStatusBadge status={record.status} /></td>
                      <td className="max-w-xs px-4 py-4 text-sm text-gray-600">{record.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {records.map((record) => (
                <article key={record._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase text-gray-500">Gym date</p><h3 className="mt-1 font-bold text-gray-900">{formatAttendanceGymDate(record.attendanceDate)}</h3></div>
                    <AttendanceStatusBadge status={record.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <div><dt className="text-xs font-semibold uppercase text-gray-500">Check-In</dt><dd className="mt-1 text-sm font-semibold text-gray-900">{formatGymTime(record.checkInAt)}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-gray-500">Check-Out</dt><dd className="mt-1 text-sm font-semibold text-gray-900">{formatGymTime(record.checkOutAt)}</dd></div>
                    {record.notes && <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-gray-500">Notes</dt><dd className="mt-1 break-words text-sm text-gray-700">{record.notes}</dd></div>}
                  </dl>
                </article>
              ))}
            </div>

            <AttendancePagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
