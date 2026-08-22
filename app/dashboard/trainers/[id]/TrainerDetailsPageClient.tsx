'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteTrainerDialog from '../DeleteTrainerDialog';
import { TrainerPageError, TrainerPageLoading } from '../TrainerPageState';
import { useTrainer } from '../useTrainer';
import TrainerDetails from './TrainerDetails';

interface TrainerDetailsPageClientProps {
  trainerId: string;
  success?: 'created' | 'updated';
}

export default function TrainerDetailsPageClient({ trainerId, success }: TrainerDetailsPageClientProps) {
  const router = useRouter();
  const { trainer, loading, error, retry } = useTrainer(trainerId);
  const [showDelete, setShowDelete] = useState(false);
  const closeDelete = useCallback(() => setShowDelete(false), []);

  if (loading) return <TrainerPageLoading />;
  if (error) return <TrainerPageError error={error} onRetry={retry} />;
  if (!trainer) return <TrainerPageError error="generic" onRetry={retry} />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {success && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Trainer {success === 'created' ? 'created' : 'updated'} successfully.
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/trainers" className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            ← Back to Trainers
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Trainer Details</h1>
          <p className="mt-1 text-sm text-gray-500">Review this trainer&apos;s professional and contact information.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Link href={`/dashboard/trainers/${encodeURIComponent(trainer.trainerId)}/edit`} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Edit
          </Link>
          <button type="button" onClick={() => setShowDelete(true)} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            Delete
          </button>
        </div>
      </div>

      <TrainerDetails trainer={trainer} />

      {showDelete && (
        <DeleteTrainerDialog
          trainer={trainer}
          onClose={closeDelete}
          onDeleted={() => {
            setShowDelete(false);
            router.replace('/dashboard/trainers');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
