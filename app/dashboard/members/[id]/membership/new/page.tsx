import MembershipAssignmentPageClient from './MembershipAssignmentPageClient';

export default async function NewMembershipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MembershipAssignmentPageClient memberId={id} />;
}
