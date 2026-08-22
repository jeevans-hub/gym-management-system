import AttendancePageClient from './AttendancePageClient';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member } = await searchParams;
  return <AttendancePageClient initialSearch={member?.trim() || ''} />;
}
