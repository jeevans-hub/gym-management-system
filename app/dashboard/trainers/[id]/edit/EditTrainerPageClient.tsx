'use client';

import Link from 'next/link';
import TrainerForm from '../../TrainerForm';
import { trainerToFormValues } from '../../trainer-form-utils';
import { TrainerPageError, TrainerPageLoading } from '../../TrainerPageState';
import { useTrainer } from '../../useTrainer';

export default function EditTrainerPageClient({ trainerId }: { trainerId: string }) {
  const { trainer, loading, error, retry } = useTrainer(trainerId);

  if (loading) return <TrainerPageLoading label="Loading trainer form…" />;
  if (error) return <TrainerPageError error={error} onRetry={retry} />;
  if (!trainer) return <TrainerPageError error="generic" onRetry={retry} />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Link href={`/dashboard/trainers/${encodeURIComponent(trainer.trainerId)}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          ← Back to Trainer
        </Link>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Edit Trainer</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">Update professional and contact information.</p>
          </div>
          <span className="self-start rounded-lg bg-blue-50 px-3 py-2 font-mono text-sm font-semibold text-blue-700 sm:self-auto">{trainer.trainerId}</span>
        </div>
      </div>
      <TrainerForm key={trainer.trainerId} mode="edit" trainerId={trainer.trainerId} initialValues={trainerToFormValues(trainer)} />
    </div>
  );
}
