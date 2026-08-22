import PaymentDetailsPageClient from './PaymentDetailsPageClient';

export default async function PaymentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recorded?: string; returnTo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = query.returnTo?.trim() || '';
  const safeReturnTo = /^\/dashboard\/payments(?:\?[^#]*)?$/.test(returnTo)
    ? returnTo
    : '/dashboard/payments';
  return <PaymentDetailsPageClient paymentId={id} recorded={query.recorded === '1'} backHref={safeReturnTo} />;
}
