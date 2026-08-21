import MemberDetailsPageClient from './MemberDetailsPageClient';

export default async function MemberDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const success = query.created === '1' ? 'created' : query.updated === '1' ? 'updated' : undefined;
  return <MemberDetailsPageClient memberId={id} success={success} />;
}
