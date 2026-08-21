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

function MemberActions() {
  return (
    <div className="flex items-center gap-1" aria-label="Member actions coming in Phase 4.3">
      {['View', 'Edit', 'Delete'].map((action) => (
        <button
          key={action}
          type="button"
          disabled
          title={`${action} member — coming soon`}
          className="cursor-not-allowed rounded-md px-2 py-1.5 text-xs font-medium text-gray-400"
        >
          {action}
        </button>
      ))}
    </div>
  );
}

export default function MembersTable({ members }: { members: MemberListItem[] }) {
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
                  {member.memberId}
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
                <td className="px-5 py-4"><div className="flex justify-end"><MemberActions /></div></td>
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
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-2"><MemberActions /></div>
          </article>
        ))}
      </div>
    </>
  );
}
