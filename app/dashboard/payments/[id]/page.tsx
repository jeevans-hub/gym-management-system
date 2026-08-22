import PaymentDetailsPageClient from './PaymentDetailsPageClient';

export default async function PaymentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recorded?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PaymentDetailsPageClient paymentId={id} recorded={query.recorded === '1'} />;
}
