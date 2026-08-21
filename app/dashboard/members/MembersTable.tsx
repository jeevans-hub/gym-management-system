import Link from 'next/link';
import MemberStatusBadge from './MemberStatusBadge';
import type { MemberListItem } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatJoiningDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function MemberActions({ member, onDelete }: { member: MemberListItem; onDelete: (member: MemberListItem) => void }) {
  const memberPath = `/dashboard/members/${encodeURIComponent(member.memberId)}`;
  return (
    <div className="flex items-center gap-1" aria-label={`Actions for ${member.firstName} ${member.lastName}`}>
      <Link href={memberPath} className="rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        View
      </Link>
      <Link href={`${memberPath}/edit`} className="rounded-md px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Edit
      </Link>
      <button type="button" onClick={() => onDelete(member)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
        Delete
      </button>
    </div>
  );
}

export default function MembersTable({ members, onDelete }: { members: MemberListItem[]; onDelete: (member: MemberListItem) => void }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3.5">Member ID</th>
              <th className="px-5 py-3.5">Member name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Joining date</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.memberId} className="transition-colors hover:bg-blue-50/30">
                <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-blue-700">
                  <Link href={`/dashboard/members/${encodeURIComponent(member.memberId)}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {member.memberId}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900">{member.firstName} {member.lastName}</p>
                </td>
                <td className="max-w-52 truncate px-5 py-4 text-sm text-gray-600">{member.email || 'Not provided'}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{member.phone}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                  {formatJoiningDate(member.joiningDate)}
                </td>
                <td className="px-5 py-4"><MemberStatusBadge status={member.status} /></td>
                <td className="px-5 py-4"><div className="flex justify-end"><MemberActions member={member} onDelete={onDelete} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {members.map((member) => (
          <article key={member.memberId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-blue-700">{member.memberId}</p>
                <h2 className="mt-1 truncate font-semibold text-gray-900">
                  {member.firstName} {member.lastName}
                </h2>
              </div>
              <MemberStatusBadge status={member.status} />
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Email</dt>
                <dd className="min-w-0 truncate text-right text-gray-700">{member.email || 'Not provided'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-right text-gray-700">{member.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Joined</dt>
                <dd className="text-right text-gray-700">{formatJoiningDate(member.joiningDate)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-2"><MemberActions member={member} onDelete={onDelete} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
