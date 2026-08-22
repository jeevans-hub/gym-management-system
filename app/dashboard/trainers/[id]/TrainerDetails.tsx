import TrainerStatusBadge from '../TrainerStatusBadge';
import {
  formatTrainerDate,
  formatTrainerExperience,
  formatTrainerGender,
  formatTrainerSalary,
} from '../trainer-format';
import type { TrainerRecord } from '../types';

function DetailItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50/70 p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ProfileImageValue({ value }: { value?: string }) {
  if (!value) return <>Not specified</>;
  if (/^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {value}
      </a>
    );
  }
  return <span className="break-all">{value}</span>;
}

export default function TrainerDetails({ trainer }: { trainer: TrainerRecord }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white" aria-hidden="true">
              {trainer.firstName.charAt(0).toUpperCase()}{trainer.lastName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-blue-700">{trainer.trainerId}</p>
              <h2 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{trainer.firstName} {trainer.lastName}</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">{trainer.specialization}</p>
            </div>
          </div>
          <TrainerStatusBadge status={trainer.status} />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Email" value={trainer.email || 'Not specified'} />
          <DetailItem label="Phone" value={trainer.phone} />
          <DetailItem label="Gender" value={formatTrainerGender(trainer.gender)} />
          <DetailItem label="Specialization" value={trainer.specialization} />
          <DetailItem label="Experience" value={formatTrainerExperience(trainer.experienceYears)} />
          <DetailItem label="Joining date" value={formatTrainerDate(trainer.joiningDate)} />
          <DetailItem label="Salary" value={formatTrainerSalary(trainer.salary)} />
          <DetailItem label="Status" value={<span className="capitalize">{trainer.status}</span>} />
          <DetailItem label="Address" value={trainer.address || 'Not specified'} wide />
          <DetailItem label="Profile image URL or path" value={<ProfileImageValue value={trainer.profileImage} />} wide />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Emergency contact</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Contact name" value={trainer.emergencyContactName || 'Not specified'} />
          <DetailItem label="Contact phone" value={trainer.emergencyContactPhone || 'Not specified'} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{trainer.notes || 'No notes added.'}</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Record history</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Created" value={formatTrainerDate(trainer.createdAt, true)} />
          <DetailItem label="Last updated" value={formatTrainerDate(trainer.updatedAt, true)} />
        </dl>
      </section>
    </div>
  );
}
