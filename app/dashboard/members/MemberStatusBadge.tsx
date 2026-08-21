import type { MemberStatus } from './types';

export default function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const isActive = status === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
          : 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {status}
    </span>
  );
}
