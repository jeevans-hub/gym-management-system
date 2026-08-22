export default function UserRoleBadge({ role }: { role: 'admin' | 'staff' }) {
  const isAdmin = role === 'admin';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
      {isAdmin ? 'Admin' : 'Staff'}
    </span>
  );
}
