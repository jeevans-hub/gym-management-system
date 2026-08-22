import PaymentsPageClient from './PaymentsPageClient';

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; membership?: string; recorded?: string; date?: string; from?: string; to?: string }>;
}) {
  const query = await searchParams;
  return (
    <PaymentsPageClient
      initialMember={query.member?.trim() || ''}
      initialMembership={query.membership?.trim() || ''}
      initialDate={query.date?.trim() || ''}
      initialFrom={query.from?.trim() || ''}
      initialTo={query.to?.trim() || ''}
      recorded={query.recorded === '1'}
    />
  );
}
