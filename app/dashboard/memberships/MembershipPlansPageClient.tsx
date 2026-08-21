'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeletePlanDialog from './DeletePlanDialog';
import MembershipStatusBadge from './MembershipStatusBadge';
import { currencyFormatter, durationLabel, formatDate } from './format';
import type { MembershipPlanRecord, PlansResponse, PlanStatus } from './types';

const PAGE_SIZE = 8;

export default function MembershipPlansPageClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<MembershipPlanRecord[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PlanStatus>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<MembershipPlanRecord | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      try {
        const response = await fetch(`/api/membership-plans?${params}`, { signal: controller.signal, credentials: 'same-origin' });
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error();
        const data = await response.json() as PlansResponse;
        setPlans(data.plans); setTotal(data.total); setTotalPages(data.totalPages);
        if (data.totalPages > 0 && page > data.totalPages) setPage(data.totalPages);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) setError('Membership plans could not be loaded. Please try again.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [page, reloadKey, router, search, status]);

  function submitSearch(event: React.FormEvent) { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }
  function resetFilters() { setSearchInput(''); setSearch(''); setStatus('all'); setPage(1); }

  return <div className="mx-auto w-full max-w-7xl space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-blue-700">Membership management</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Membership Plans</h1><p className="mt-1 text-sm text-gray-500">Create and maintain the plans available to your members.</p></div>
      <Link href="/dashboard/memberships/plans/new" className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">+ Add Plan</Link>
    </header>

    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <label className="text-sm font-semibold text-gray-700">Search plans<span className="sr-only"> by name or description</span><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name or description" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="text-sm font-semibold text-gray-700">Status<select value={status} onChange={(e) => { setStatus(e.target.value as 'all' | PlanStatus); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <button className="self-end rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">Search</button>
      </form>
    </section>

    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center"><p className="font-semibold text-red-900">Unable to load plans</p><p className="mt-1 text-sm text-red-700">{error}</p><button onClick={() => setReloadKey((v) => v + 1)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500">Try again</button></div>
    : loading ? <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-gray-200 bg-white p-5"><div className="h-4 w-2/3 rounded bg-gray-200" /><div className="mt-4 h-3 rounded bg-gray-100" /><div className="mt-2 h-3 w-4/5 rounded bg-gray-100" /></div>)}</div>
    : plans.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center"><h2 className="text-lg font-semibold text-gray-900">No membership plans found</h2><p className="mt-2 text-sm text-gray-500">{search || status !== 'all' ? 'Try changing your search or filter.' : 'Add your first plan to begin assigning memberships.'}</p>{search || status !== 'all' ? <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800">Clear filters</button> : <Link href="/dashboard/memberships/plans/new" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Add Plan</Link>}</div>
    : <><div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block"><table className="w-full table-fixed text-left"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="w-[28%] px-5 py-3">Plan</th><th className="w-[14%] px-5 py-3">Duration</th><th className="w-[15%] px-5 py-3">Price</th><th className="w-[13%] px-5 py-3">Status</th><th className="w-[16%] px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{plans.map((plan) => <tr key={plan._id} className="hover:bg-gray-50/70"><td className="px-5 py-4"><p className="font-semibold text-gray-900">{plan.name}</p><p className="mt-1 truncate text-sm text-gray-500">{plan.description || 'No description'}</p></td><td className="px-5 py-4 text-sm text-gray-700">{durationLabel(plan.durationMonths)}</td><td className="px-5 py-4 text-sm font-semibold text-gray-900">{currencyFormatter.format(plan.price)}</td><td className="px-5 py-4"><MembershipStatusBadge status={plan.status} /></td><td className="px-5 py-4 text-sm text-gray-600">{formatDate(plan.createdAt)}</td><td className="px-5 py-4 text-right"><Link className="text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500" href={`/dashboard/memberships/plans/${plan._id}/edit`}>Edit</Link><button className="ml-4 text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500" onClick={() => setDeleting(plan)}>Delete</button></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 lg:hidden">{plans.map((plan) => <article key={plan._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-gray-900">{plan.name}</h2><p className="mt-1 text-sm text-gray-500">{plan.description || 'No description'}</p></div><MembershipStatusBadge status={plan.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-gray-500">Duration</dt><dd className="font-semibold text-gray-900">{durationLabel(plan.durationMonths)}</dd></div><div><dt className="text-gray-500">Price</dt><dd className="font-semibold text-gray-900">{currencyFormatter.format(plan.price)}</dd></div></dl><div className="mt-5 flex gap-2"><Link href={`/dashboard/memberships/plans/${plan._id}/edit`} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">View / Edit</Link><button onClick={() => setDeleting(plan)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Delete</button></div></article>)}</div>
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-gray-600">Showing {plans.length} of {total} plan{total === 1 ? '' : 's'}</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="px-2 text-sm text-gray-600">Page {page} of {Math.max(totalPages, 1)}</span><button disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div></>}
    {deleting && <DeletePlanDialog plan={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); setReloadKey((v) => v + 1); }} />}
  </div>;
}
