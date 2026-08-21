'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlanForm from '../../../PlanForm';
import type { MembershipPlanRecord } from '../../../types';

export default function EditPlanPageClient({ planId }: { planId: string }) {
  const router = useRouter(); const [plan, setPlan] = useState<MembershipPlanRecord | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => { const controller = new AbortController(); async function load() { setLoading(true); setError(''); try { const response = await fetch(`/api/membership-plans/${encodeURIComponent(planId)}`, { signal: controller.signal }); if (response.status === 401) { router.replace('/login'); return; } if (response.status === 404) { setError('This membership plan could not be found.'); return; } if (!response.ok) throw new Error(); const data = await response.json() as { plan: MembershipPlanRecord }; setPlan(data.plan); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError('The membership plan could not be loaded.'); } finally { if (!controller.signal.aborted) setLoading(false); } } void load(); return () => controller.abort(); }, [planId, retry, router]);
  if (loading) return <div role="status" className="mx-auto max-w-3xl animate-pulse space-y-5"><div className="h-8 w-56 rounded bg-gray-200" /><div className="h-96 rounded-xl bg-white" /></div>;
  if (error || !plan) return <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-8 text-center"><h1 className="font-bold text-red-900">Unable to edit plan</h1><p className="mt-2 text-sm text-red-700">{error}</p><div className="mt-5 flex justify-center gap-3"><Link href="/dashboard/memberships" className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800">Back</Link><button onClick={() => setRetry((v) => v + 1)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div></div>;
  return <div className="mx-auto w-full max-w-3xl space-y-5"><header><Link href="/dashboard/memberships" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to Membership Plans</Link><h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Edit Membership Plan</h1><p className="mt-1 text-sm text-gray-500">Changes affect future assignments; existing purchase history remains preserved.</p></header><PlanForm mode="edit" planId={plan._id} initialValues={{ name: plan.name, description: plan.description || '', durationMonths: String(plan.durationMonths), price: String(plan.price), status: plan.status }} /></div>;
}
