'use client';

import { useEffect, useRef } from 'react';
import { formatGymTime, memberName } from './attendance-format';
import type { AttendanceRecord } from './types';

export default function CheckOutDialog({
  record,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  record: AttendanceRecord;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="check-out-title" aria-describedby="check-out-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="check-out-title" className="text-lg font-bold text-gray-900">Check out {memberName(record.member)}?</h2>
        <p id="check-out-description" className="mt-2 text-sm leading-6 text-gray-600">Checked in at {formatGymTime(record.checkInAt)}. The server will record the current gym time as check-out.</p>
        {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">Keep Checked In</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">{busy ? 'Checking out…' : 'Confirm Check-Out'}</button>
        </div>
      </div>
    </div>
  );
}
