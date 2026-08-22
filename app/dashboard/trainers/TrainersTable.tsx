import Link from 'next/link';
import TrainerStatusBadge from './TrainerStatusBadge';
import { formatTrainerDate, formatTrainerExperience } from './trainer-format';
import type { TrainerListItem } from './types';

function TrainerActions({ trainer, onDelete }: { trainer: TrainerListItem; onDelete: (trainer: TrainerListItem) => void }) {
  const trainerPath = `/dashboard/trainers/${encodeURIComponent(trainer.trainerId)}`;
  return (
    <div className="flex items-center gap-1" aria-label={`Actions for ${trainer.firstName} ${trainer.lastName}`}>
      <Link href={trainerPath} className="rounded-md px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        View
      </Link>
      <Link href={`${trainerPath}/edit`} className="rounded-md px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Edit
      </Link>
      <button type="button" onClick={() => onDelete(trainer)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
        Delete
      </button>
    </div>
  );
}

export default function TrainersTable({ trainers, onDelete }: { trainers: TrainerListItem[]; onDelete: (trainer: TrainerListItem) => void }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1220px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3.5">Trainer ID</th>
              <th className="px-5 py-3.5">Trainer name</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Specialization</th>
              <th className="px-5 py-3.5">Experience</th>
              <th className="px-5 py-3.5">Joining date</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trainers.map((trainer) => (
              <tr key={trainer.trainerId} className="transition-colors hover:bg-blue-50/30">
                <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-blue-700">
                  <Link href={`/dashboard/trainers/${encodeURIComponent(trainer.trainerId)}`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {trainer.trainerId}
                  </Link>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">{trainer.firstName} {trainer.lastName}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{trainer.phone}</td>
                <td className="max-w-56 truncate px-5 py-4 text-sm text-gray-600">{trainer.email || 'Not specified'}</td>
                <td className="px-5 py-4 text-sm font-medium text-gray-700">{trainer.specialization}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{formatTrainerExperience(trainer.experienceYears)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{formatTrainerDate(trainer.joiningDate)}</td>
                <td className="px-5 py-4"><TrainerStatusBadge status={trainer.status} /></td>
                <td className="px-5 py-4"><div className="flex justify-end"><TrainerActions trainer={trainer} onDelete={onDelete} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 md:hidden">
        {trainers.map((trainer) => (
          <article key={trainer.trainerId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-blue-700">{trainer.trainerId}</p>
                <h2 className="mt-1 truncate font-semibold text-gray-900">{trainer.firstName} {trainer.lastName}</h2>
                <p className="mt-1 truncate text-sm font-medium text-gray-600">{trainer.specialization}</p>
              </div>
              <TrainerStatusBadge status={trainer.status} />
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Phone</dt><dd className="text-right text-gray-700">{trainer.phone}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Email</dt><dd className="min-w-0 truncate text-right text-gray-700">{trainer.email || 'Not specified'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Experience</dt><dd className="text-right text-gray-700">{formatTrainerExperience(trainer.experienceYears)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Joined</dt><dd className="text-right text-gray-700">{formatTrainerDate(trainer.joiningDate)}</dd></div>
            </dl>
            <div className="mt-3 flex justify-end border-t border-gray-100 pt-2"><TrainerActions trainer={trainer} onDelete={onDelete} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
