import MemberAttendanceHistoryClient from './MemberAttendanceHistoryClient';

export default async function MemberAttendanceHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberAttendanceHistoryClient memberId={id} />;
}
