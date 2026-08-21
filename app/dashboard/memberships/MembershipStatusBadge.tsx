import type { MembershipStatus, PlanStatus } from './types';

export default function MembershipStatusBadge({ status }: { status: MembershipStatus | PlanStatus }) {
  const styles = status === 'active'
    ? 'bg-emerald-100 text-emerald-800 ring-emerald-600/20'
    : status === 'cancelled'
      ? 'bg-red-100 text-red-800 ring-red-600/20'
      : status === 'expired'
        ? 'bg-amber-100 text-amber-800 ring-amber-600/20'
        : 'bg-gray-100 text-gray-700 ring-gray-500/20';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles}`}>{status}</span>;
}
