'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanFormValues } from './types';

type Errors = Partial<Record<keyof PlanFormValues, string>>;
const input = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100';

function validate(values: PlanFormValues): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = 'Plan name is required.';
  else if (values.name.trim().length > 100) errors.name = 'Plan name cannot exceed 100 characters.';
  if (values.description.trim().length > 500) errors.description = 'Description cannot exceed 500 characters.';
  const duration = Number(values.durationMonths);
  if (!Number.isInteger(duration) || duration < 1 || duration > 120) errors.durationMonths = 'Enter a whole number from 1 to 120.';
  const price = Number(values.price);
  if (!Number.isFinite(price) || price < 0) errors.price = 'Enter a valid non-negative price.';
  return errors;
}

export default function PlanForm({ mode, planId, initialValues }: { mode: 'create' | 'edit'; planId?: string; initialValues: PlanFormValues }) {
  const router = useRouter(); const [values, setValues] = useState(initialValues); const [errors, setErrors] = useState<Errors>({}); const [apiError, setApiError] = useState(''); const [busy, setBusy] = useState(false);
  function update<K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) { setValues((v) => ({ ...v, [key]: value })); setErrors((e) => ({ ...e, [key]: undefined })); setApiError(''); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next = validate(values); setErrors(next); setApiError('');
    if (Object.keys(next).length) { const el = event.currentTarget.elements.namedItem(Object.keys(next)[0]); if (el instanceof HTMLElement) el.focus(); return; }
    setBusy(true);
    try {
      const response = await fetch(mode === 'edit' ? `/api/membership-plans/${encodeURIComponent(planId!)}` : '/api/membership-plans', { method: mode === 'edit' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.name.trim(), description: values.description.trim(), durationMonths: Number(values.durationMonths), price: Number(values.price), status: values.status }) });
      if (response.status === 401) { router.replace('/login'); return; }
      const result = await response.json().catch(() => null) as { error?: string; details?: string[] } | null;
      if (!response.ok) { if (response.status === 409) setApiError('A membership plan with this name already exists. Choose a different name.'); else if (response.status === 404) setApiError('This membership plan no longer exists.'); else setApiError(result?.details?.join(' ') || 'The membership plan could not be saved. Please try again.'); return; }
      router.push('/dashboard/memberships'); router.refresh();
    } catch { setApiError('The membership plan could not be saved. Check your connection and try again.'); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} noValidate className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
    {apiError && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{apiError}</div>}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Plan name <span className="text-red-600">*</span><input name="name" value={values.name} onChange={(e) => update('name', e.target.value)} disabled={busy} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} className={input} maxLength={100} />{errors.name && <span id="name-error" className="mt-1.5 block text-xs text-red-600">{errors.name}</span>}</label>
      <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Description<textarea name="description" value={values.description} onChange={(e) => update('description', e.target.value)} disabled={busy} aria-invalid={!!errors.description} className={`${input} min-h-28 resize-y`} maxLength={500} />{errors.description && <span className="mt-1.5 block text-xs text-red-600">{errors.description}</span>}</label>
      <label className="text-sm font-semibold text-gray-700">Duration in months <span className="text-red-600">*</span><input name="durationMonths" type="number" min="1" max="120" step="1" value={values.durationMonths} onChange={(e) => update('durationMonths', e.target.value)} disabled={busy} aria-invalid={!!errors.durationMonths} className={input} />{errors.durationMonths && <span className="mt-1.5 block text-xs text-red-600">{errors.durationMonths}</span>}</label>
      <label className="text-sm font-semibold text-gray-700">Price (₹) <span className="text-red-600">*</span><input name="price" type="number" min="0" step="0.01" value={values.price} onChange={(e) => update('price', e.target.value)} disabled={busy} aria-invalid={!!errors.price} className={input} />{errors.price && <span className="mt-1.5 block text-xs text-red-600">{errors.price}</span>}</label>
      <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Status<select name="status" value={values.status} onChange={(e) => update('status', e.target.value as PlanFormValues['status'])} disabled={busy} className={input}><option value="active">Active — available for assignment</option><option value="inactive">Inactive — hidden from assignment</option></select></label>
    </div><div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link href="/dashboard/memberships" className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">Cancel</Link><button disabled={busy} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">{busy ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Plan'}</button></div>
  </form>;
}
