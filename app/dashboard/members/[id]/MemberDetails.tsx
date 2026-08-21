import MemberStatusBadge from '../MemberStatusBadge';
import type { MemberRecord } from '../types';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function formatDate(value?: string, includeTime = false) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return includeTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function formatGender(value?: MemberRecord['gender']) {
  if (!value) return 'Not specified';
  return value.split('-').map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
}

function DetailItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50/70 p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default function MemberDetails({ member }: { member: MemberRecord }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
              {member.firstName.charAt(0).toUpperCase()}{member.lastName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-blue-700">{member.memberId}</p>
              <h2 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{member.firstName} {member.lastName}</h2>
            </div>
          </div>
          <MemberStatusBadge status={member.status} />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Email" value={member.email || 'Not provided'} />
          <DetailItem label="Phone" value={member.phone} />
          <DetailItem label="Gender" value={formatGender(member.gender)} />
          <DetailItem label="Date of birth" value={formatDate(member.dateOfBirth)} />
          <DetailItem label="Joining date" value={formatDate(member.joiningDate)} />
          <DetailItem label="Status" value={<span className="capitalize">{member.status}</span>} />
          <DetailItem label="Address" value={member.address || 'Not provided'} wide />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Emergency contact</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Contact name" value={member.emergencyContactName || 'Not provided'} />
          <DetailItem label="Contact phone" value={member.emergencyContactPhone || 'Not provided'} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Record history</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Created" value={formatDate(member.createdAt, true)} />
          <DetailItem label="Last updated" value={formatDate(member.updatedAt, true)} />
        </dl>
      </section>
    </div>
  );
}
