import PaymentsPageClient from './PaymentsPageClient';
import { getGymDayBounds } from '@/lib/attendance-dates';
import type { PaymentMethod, PaymentStatus } from './types';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank-transfer', 'other'];
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'refunded'];

function validDate(value?: string): string {
  const normalized = value?.trim() || '';
  return normalized && getGymDayBounds(normalized) ? normalized : '';
}

function positivePage(value?: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; member?: string; membership?: string; paymentMethod?: string; status?: string; page?: string; recorded?: string; date?: string; from?: string; to?: string }>;
}) {
  const query = await searchParams;
  const method = query.paymentMethod?.trim() as PaymentMethod | undefined;
  const status = query.status?.trim() as PaymentStatus | undefined;
  const membership = query.membership?.trim() || '';
  return (
    <PaymentsPageClient
      initialSearch={query.search?.trim() || ''}
      initialMember={query.member?.trim() || ''}
      initialMembership={/^[a-f\d]{24}$/i.test(membership) ? membership : ''}
      initialMethod={method && PAYMENT_METHODS.includes(method) ? method : 'all'}
      initialStatus={status && PAYMENT_STATUSES.includes(status) ? status : 'all'}
      initialDate={validDate(query.date)}
      initialFrom={validDate(query.from)}
      initialTo={validDate(query.to)}
      initialPage={positivePage(query.page)}
      recorded={query.recorded === '1'}
    />
  );
}
