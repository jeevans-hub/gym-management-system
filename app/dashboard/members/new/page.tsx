import Link from 'next/link';
import MemberForm from '../MemberForm';
import { emptyMemberFormValues } from '../member-form-utils';

export default function NewMemberPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Link href="/dashboard/members" className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          ← Back to Members
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Add Member</h1>
        <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">
          Create a complete member profile for your gym directory.
        </p>
      </div>
      <MemberForm key="new-member" mode="create" initialValues={emptyMemberFormValues()} />
    </div>
  );
}
