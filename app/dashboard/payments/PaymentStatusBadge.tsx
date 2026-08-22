import type { PaymentStatus } from './types';

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const paid = status === 'paid';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${paid ? 'bg-emerald-100 text-emerald-800 ring-emerald-600/20' : 'bg-amber-100 text-amber-900 ring-amber-600/20'}`}>
      {paid ? 'Paid' : 'Refunded'}
    </span>
  );
}
