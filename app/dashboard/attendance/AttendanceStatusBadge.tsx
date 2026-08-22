import type { AttendanceStatus } from './types';

export default function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const checkedIn = status === 'checked-in';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${checkedIn ? 'bg-emerald-100 text-emerald-800 ring-emerald-600/20' : 'bg-blue-100 text-blue-800 ring-blue-600/20'}`}>
      {checkedIn ? 'Checked In' : 'Checked Out'}
    </span>
  );
}
