import NewPaymentPageClient from './NewPaymentPageClient';

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; membership?: string }>;
}) {
  const query = await searchParams;
  return (
    <NewPaymentPageClient
      initialMember={query.member?.trim() || ''}
      initialMembership={query.membership?.trim() || ''}
    />
  );
}
