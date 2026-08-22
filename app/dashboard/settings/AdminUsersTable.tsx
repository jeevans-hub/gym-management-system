import UserRoleBadge from './UserRoleBadge';
import type { AdminUser } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function UserActions({
  user,
  onView,
  onEdit,
}: {
  user: AdminUser;
  onView: (user: AdminUser) => void;
  onEdit: (user: AdminUser) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1" aria-label={`Actions for ${user.name}`}>
      <button type="button" onClick={() => onView(user)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">View</button>
      <button type="button" onClick={() => onEdit(user)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">Edit</button>
    </div>
  );
}

export default function AdminUsersTable({
  users,
  onView,
  onEdit,
}: {
  users: AdminUser[];
  onView: (user: AdminUser) => void;
  onEdit: (user: AdminUser) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Updated</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/30">
                <td className="px-5 py-4 font-semibold text-gray-950">{user.name}</td>
                <td className="max-w-64 truncate px-5 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-5 py-4"><UserRoleBadge role={user.role} /></td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{formatDate(user.updatedAt)}</td>
                <td className="px-5 py-4"><UserActions user={user} onView={onView} onEdit={onEdit} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {users.map((user) => (
          <article key={user.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-gray-950">{user.name}</h3>
                <p className="mt-1 truncate text-sm text-gray-600">{user.email}</p>
              </div>
              <UserRoleBadge role={user.role} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-gray-500">Created</dt><dd className="mt-1 font-medium text-gray-700">{formatDate(user.createdAt)}</dd></div>
              <div><dt className="text-xs text-gray-500">Updated</dt><dd className="mt-1 font-medium text-gray-700">{formatDate(user.updatedAt)}</dd></div>
            </dl>
            <div className="mt-3 border-t border-gray-100 pt-2"><UserActions user={user} onView={onView} onEdit={onEdit} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
