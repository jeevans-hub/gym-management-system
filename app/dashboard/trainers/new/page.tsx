import Link from 'next/link';
import TrainerForm from '../TrainerForm';
import { emptyTrainerFormValues } from '../trainer-form-utils';

export default function NewTrainerPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <Link href="/dashboard/trainers" className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          ← Back to Trainers
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Add Trainer</h1>
        <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">
          Create a professional Trainer profile for your coaching directory.
        </p>
      </div>
      <TrainerForm key="new-trainer" mode="create" initialValues={emptyTrainerFormValues()} />
    </div>
  );
}
