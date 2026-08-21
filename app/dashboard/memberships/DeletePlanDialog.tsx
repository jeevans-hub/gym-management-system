'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MembershipPlanRecord } from './types';

export default function DeletePlanDialog({ plan, onClose, onDeleted }: { plan: MembershipPlanRecord; onClose: () => void; onDeleted: () => void }) {
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cancelRef.current?.focus();
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && !busy) onClose(); }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [busy, onClose]);

  async function remove() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/membership-plans/${encodeURIComponent(plan._id)}`, { method: 'DELETE' });
      if (response.status === 401) { router.replace('/login'); return; }
      if (response.status === 409) { setError('This plan cannot be deleted because it is already in use. Mark it inactive instead to preserve membership history.'); return; }
      if (!response.ok) { setError(response.status === 404 ? 'This plan no longer exists.' : 'The plan could not be deleted. Please try again.'); return; }
      onDeleted();
    } catch { setError('The plan could not be deleted. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" aria-describedby="delete-plan-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <h2 id="delete-plan-title" className="text-lg font-bold text-gray-900">Delete membership plan?</h2>
      <p id="delete-plan-description" className="mt-2 text-sm leading-6 text-gray-600">Delete <strong>{plan.name}</strong>? This is only allowed when the plan has never been used.</p>
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button ref={cancelRef} type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={busy} onClick={remove} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete plan'}</button>
      </div>
    </div>
  </div>;
}
