'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPaymentDate, inrFormatter, paymentMemberName, paymentMethodLabel } from '../payment-format';
import PaymentStatusBadge from '../PaymentStatusBadge';
import type { PaymentDetailResponse } from '../types';
import RefundPaymentDialog from './RefundPaymentDialog';

export default function PaymentDetailsPageClient({ paymentId, recorded }: { paymentId: string; recorded: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<PaymentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refunded, setRefunded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPayment() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, { signal: controller.signal });
        if (response.status === 401) return router.replace('/login');
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error();
        setData((await response.json()) as PaymentDetailResponse);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) setError('Payment details could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadPayment();
    return () => controller.abort();
  }, [paymentId, reloadKey, router]);

  if (loading && !data) return <div role="status" aria-label="Loading payment details" className="mx-auto h-96 w-full max-w-4xl animate-pulse rounded-xl border border-gray-200 bg-white" />;
  if (notFound) return <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-gray-900">Payment not found</h1><p className="mt-2 text-sm text-gray-500">The requested payment does not exist or is no longer available.</p><Link href="/dashboard/payments" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Back to Payments</Link></div>;
  if (error && !data) return <div role="alert" className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center"><h1 className="font-semibold text-red-900">Unable to load payment</h1><p className="mt-2 text-sm text-red-700">{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-5 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">Try again</button></div>;
  if (!data) return null;

  const { payment, totals } = data;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/dashboard/payments" className="text-sm font-semibold text-blue-700 hover:text-blue-900">← Back to Payments</Link><p className="mt-5 text-sm font-semibold text-blue-700">Payment record · INR · IST</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Payment Details</h1></div>
        {payment.status === 'paid' && <button type="button" onClick={() => setRefundOpen(true)} className="rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Refund Payment</button>}
      </header>
      {(recorded || refunded) && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{refunded ? 'Payment refunded successfully. The membership balance has been updated.' : 'Payment recorded successfully.'}</div>}

      <section aria-labelledby="receipt-heading" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-5 sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="receipt-heading" className="text-lg font-bold text-gray-900">Receipt summary</h2><p className="mt-1 text-sm text-gray-500">Recorded {formatPaymentDate(payment.paymentDate)}</p></div><PaymentStatusBadge status={payment.status} /></div><p className="mt-5 text-3xl font-bold text-gray-950">{inrFormatter.format(payment.amount)}</p>{payment.status === 'refunded' && <p className="mt-2 text-sm font-medium text-red-700">Refunded amount remains visible for audit history.</p>}</div>
        <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-7">
          <Detail label="Member" value={paymentMemberName(payment.member)} secondary={payment.member.memberId} />
          <Detail label="Phone" value={payment.member.phone} />
          <Detail label="Membership plan" value={payment.membership.plan.name} secondary={`${payment.membership.plan.durationMonths} month${payment.membership.plan.durationMonths === 1 ? '' : 's'} · ${payment.membership.status}`} />
          <Detail label="Membership period" value={`${formatPaymentDate(payment.membership.startDate, false)} – ${formatPaymentDate(payment.membership.endDate, false)}`} />
          <Detail label="Purchase price" value={inrFormatter.format(payment.membership.priceAtPurchase)} />
          <Detail label="Payment method" value={paymentMethodLabel(payment.paymentMethod)} />
          <Detail label="Transaction reference" value={payment.transactionReference || 'Not provided'} />
          <Detail label="Recorded by" value={payment.recordedBy.name} secondary={payment.recordedBy.role} />
          <Detail label="Created" value={formatPaymentDate(payment.createdAt)} />
          <Detail label="Last updated" value={formatPaymentDate(payment.updatedAt)} />
          <div className="sm:col-span-2"><Detail label="Notes" value={payment.notes || 'No notes'} /></div>
        </div>
      </section>

      <section aria-labelledby="balance-heading" className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6"><h2 id="balance-heading" className="font-bold text-gray-900">Membership balance</h2><dl className="mt-4 grid gap-4 sm:grid-cols-3"><Detail label="Purchase price" value={inrFormatter.format(payment.membership.priceAtPurchase)} /><Detail label="Total paid" value={inrFormatter.format(totals.totalPaid)} /><Detail label="Remaining balance" value={inrFormatter.format(totals.remainingBalance)} /></dl>{totals.remainingBalance === 0 && <p className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">Paid in Full</p>}<div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link href={`/dashboard/payments?member=${encodeURIComponent(payment.member.memberId)}&membership=${encodeURIComponent(payment.membership._id)}`} className="rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-blue-700">View Membership Payments</Link>{totals.remainingBalance > 0 && <Link href={`/dashboard/payments/new?member=${encodeURIComponent(payment.member.memberId)}&membership=${encodeURIComponent(payment.membership._id)}`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Record Another Payment</Link>}</div></section>

      {refundOpen && <RefundPaymentDialog payment={payment} onClose={() => setRefundOpen(false)} onSuccess={(nextData) => { setData(nextData); setRefundOpen(false); setRefunded(true); }} />}
    </div>
  );
}

function Detail({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-gray-900">{value}</dd>{secondary && <dd className="mt-1 break-words text-xs text-gray-500">{secondary}</dd>}</div>;
}
