import Link from 'next/link';
import PlanForm from '../../PlanForm';

export default function NewPlanPage() {
  return <div className="mx-auto w-full max-w-3xl space-y-5"><header><Link href="/dashboard/memberships" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to Membership Plans</Link><h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Add Membership Plan</h1><p className="mt-1 text-sm text-gray-500">Set the duration and price members will see when this plan is assigned.</p></header><PlanForm mode="create" initialValues={{ name: '', description: '', durationMonths: '1', price: '', status: 'active' }} /></div>;
}
