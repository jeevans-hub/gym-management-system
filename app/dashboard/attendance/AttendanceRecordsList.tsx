import AttendanceStatusBadge from './AttendanceStatusBadge';
import { formatAttendanceGymDate, formatGymTime, memberName } from './attendance-format';
import type { AttendanceRecord } from './types';

interface AttendanceRecordsListProps {
  records: AttendanceRecord[];
  showDate?: boolean;
  onCheckOut?: (record: AttendanceRecord) => void;
}

export default function AttendanceRecordsList({
  records,
  showDate = false,
  onCheckOut,
}: AttendanceRecordsListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {showDate && <th className="px-4 py-3">Gym date</th>}
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Check-In</th>
              <th className="px-4 py-3">Check-Out</th>
              <th className="px-4 py-3">Status</th>
              {onCheckOut && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={record._id} className="hover:bg-gray-50/70">
                {showDate && (
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {formatAttendanceGymDate(record.attendanceDate)}
                  </td>
                )}
                <td className="px-4 py-4">
                  <p className="font-semibold text-gray-900">{memberName(record.member)}</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-blue-700">
                    {record.member.memberId}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{record.member.phone}</td>
                <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                  {formatGymTime(record.checkInAt)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {formatGymTime(record.checkOutAt)}
                </td>
                <td className="px-4 py-4"><AttendanceStatusBadge status={record.status} /></td>
                {onCheckOut && (
                  <td className="px-4 py-4 text-right">
                    {record.status === 'checked-in' ? (
                      <button
                        type="button"
                        onClick={() => onCheckOut(record)}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Check out ${memberName(record.member)} from attendance table`}
                      >
                        Check Out
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">Complete</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {records.map((record) => (
          <article key={record._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-gray-900">{memberName(record.member)}</h3>
                <p className="mt-1 font-mono text-xs font-semibold text-blue-700">
                  {record.member.memberId}
                </p>
                <p className="mt-1 text-sm text-gray-500">{record.member.phone}</p>
              </div>
              <AttendanceStatusBadge status={record.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {showDate && (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase text-gray-500">Gym date</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatAttendanceGymDate(record.attendanceDate)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase text-gray-500">Check-In</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatGymTime(record.checkInAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-gray-500">Check-Out</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatGymTime(record.checkOutAt)}
                </dd>
              </div>
            </dl>
            {onCheckOut && record.status === 'checked-in' && (
              <button
                type="button"
                onClick={() => onCheckOut(record)}
                className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Check out ${memberName(record.member)} from attendance card`}
              >
                Check Out
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
