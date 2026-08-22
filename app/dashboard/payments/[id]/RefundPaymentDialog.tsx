'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { inrFormatter } from '../payment-format';
import type { PaymentDetailResponse, PaymentRecord } from '../types';

export default function RefundPaymentDialog({
  payment,
  onClose,
  onSuccess,
}: {
  payment: PaymentRecord;
  onClose: () => void;
  onSuccess: (data: PaymentDetailResponse) => void;
}) {
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  async function confirmRefund() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(payment._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'refunded' }),
      });
      if (response.status === 401) return router.replace('/login');
      const data = (await response.json()) as PaymentDetailResponse & { error?: string };
      if (!response.ok) {
        setError(response.status === 404 ? 'This payment no longer exists.' : response.status === 409 ? (data.error || 'This payment is no longer refundable.') : 'The refund could not be recorded. Please try again.');
        return;
      }
      onSuccess(data);
    } catch {
      setError('The refund could not be recorded. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="refund-title" aria-describedby="refund-description" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="refund-title" className="text-lg font-bold text-gray-900">Refund this payment?</h2>
        <p id="refund-description" className="mt-2 text-sm leading-6 text-gray-600">This marks the <strong>{inrFormatter.format(payment.amount)}</strong> payment as refunded and restores that amount to the membership balance. The financial record remains in history.</p>
        {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Keep Payment</button>
          <button type="button" disabled={busy} onClick={confirmRefund} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Refunding…' : 'Confirm Refund'}</button>
        </div>
      </div>
    </div>
  );
}
