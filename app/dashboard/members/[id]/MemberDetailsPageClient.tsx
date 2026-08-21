'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteMemberDialog from '../DeleteMemberDialog';
import { MemberPageError, MemberPageLoading } from '../MemberPageState';
import { useMember } from '../useMember';
import MemberDetails from './MemberDetails';
import MemberMemberships from './MemberMemberships';

interface MemberDetailsPageClientProps {
  memberId: string;
  success?: 'created' | 'updated';
}

export default function MemberDetailsPageClient({ memberId, success }: MemberDetailsPageClientProps) {
  const router = useRouter();
  const { member, loading, error, retry } = useMember(memberId);
  const [showDelete, setShowDelete] = useState(false);
  const closeDelete = useCallback(() => setShowDelete(false), []);

  if (loading) return <MemberPageLoading />;
  if (error) return <MemberPageError error={error} onRetry={retry} />;
  if (!member) return <MemberPageError error="generic" onRetry={retry} />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {success && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Member {success === 'created' ? 'created' : 'updated'} successfully.
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/members" className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            ← Back to Members
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Member Details</h1>
          <p className="mt-1 text-sm text-gray-500">Review this member&apos;s profile and record information.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href={`/dashboard/members/${encodeURIComponent(member.memberId)}/edit`} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:flex-none">
            Edit
          </Link>
          <button type="button" onClick={() => setShowDelete(true)} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:flex-none">
            Delete
          </button>
        </div>
      </div>

      <MemberDetails member={member} />
      <MemberMemberships memberId={member.memberId} />

      {showDelete && (
        <DeleteMemberDialog
          member={member}
          onClose={closeDelete}
          onDeleted={() => {
            setShowDelete(false);
            router.replace('/dashboard/members');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
