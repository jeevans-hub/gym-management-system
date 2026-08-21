'use client';

import Link from 'next/link';
import MemberForm from '../../MemberForm';
import { memberToFormValues } from '../../member-form-utils';
import { MemberPageError, MemberPageLoading } from '../../MemberPageState';
import { useMember } from '../../useMember';

export default function EditMemberPageClient({ memberId }: { memberId: string }) {
  const { member, loading, error, retry } = useMember(memberId);

  if (loading) return <MemberPageLoading label="Loading member form…" />;
  if (error) return <MemberPageError error={error} onRetry={retry} />;
  if (!member) return <MemberPageError error="generic" onRetry={retry} />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Link href={`/dashboard/members/${encodeURIComponent(member.memberId)}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          ← Back to Member
        </Link>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Edit Member</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">Update contact and record information.</p>
          </div>
          <span className="self-start rounded-lg bg-blue-50 px-3 py-2 font-mono text-sm font-semibold text-blue-700 sm:self-auto">
            {member.memberId}
          </span>
        </div>
      </div>
      <MemberForm key={member.memberId} mode="edit" memberId={member.memberId} initialValues={memberToFormValues(member)} />
    </div>
  );
}
