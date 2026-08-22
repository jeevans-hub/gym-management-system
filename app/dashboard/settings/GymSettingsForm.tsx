'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SettingsSection from './SettingsSection';
import { SettingsErrorState, SettingsLoadingState } from './SettingsState';
import type { GymSettingsValues } from './types';

const DEFAULTS: GymSettingsValues = {
  gymName: 'Gym Management System',
  logo: '',
  address: '',
  phone: '',
  email: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  openingTime: '06:00',
  closingTime: '22:00',
  membershipExpiryWarningDays: 7,
};

type FieldErrors = Partial<Record<keyof GymSettingsValues, string>>;

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:bg-gray-50 read-only:text-gray-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

function isSafeLogo(value: string) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validate(values: GymSettingsValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.gymName.trim()) errors.gymName = 'Gym name is required.';
  else if (values.gymName.trim().length > 120) errors.gymName = 'Use 120 characters or fewer.';
  if (values.logo.length > 2048 || !isSafeLogo(values.logo.trim())) errors.logo = 'Use an HTTP(S) URL or an absolute application path beginning with /.';
  if (values.address.trim().length > 500) errors.address = 'Use 500 characters or fewer.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.phone) {
    const phone = values.phone.trim().replace(/[\s().-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(phone)) errors.phone = 'Use 7–15 digits, with an optional leading +.';
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(values.openingTime)) errors.openingTime = 'Enter a valid time in HH:mm format.';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(values.closingTime)) errors.closingTime = 'Enter a valid time in HH:mm format.';
  if (!Number.isInteger(values.membershipExpiryWarningDays) || values.membershipExpiryWarningDays < 0 || values.membershipExpiryWarningDays > 365) {
    errors.membershipExpiryWarningDays = 'Enter a whole number from 0 to 365.';
  }
  return errors;
}

export default function GymSettingsForm({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<GymSettingsValues>(DEFAULTS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/settings/gym', { signal: controller.signal, credentials: 'same-origin' });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json() as { settings?: GymSettingsValues };
        if (!data.settings) throw new Error();
        setValues({ ...DEFAULTS, ...data.settings });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setLoadError('Gym settings could not be retrieved.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reloadKey, router]);

  function update<K extends keyof GymSettingsValues>(field: K, value: GymSettingsValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || saving) return;
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage({ type: 'error', text: 'Review the highlighted settings and try again.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings/gym', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: values.gymName.trim(),
          logo: values.logo.trim(),
          address: values.address.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          currency: values.currency,
          timezone: values.timezone,
          openingTime: values.openingTime,
          closingTime: values.closingTime,
          membershipExpiryWarningDays: values.membershipExpiryWarningDays,
        }),
      });
      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }
      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Only administrators can change gym settings.' });
        return;
      }
      const data = await response.json().catch(() => null) as { settings?: GymSettingsValues; details?: string[] } | null;
      if (!response.ok || !data?.settings) {
        setMessage({ type: 'error', text: data?.details?.[0] || 'Settings could not be saved. Please try again.' });
        return;
      }
      setValues({ ...DEFAULTS, ...data.settings });
      setMessage({ type: 'success', text: 'Gym settings saved successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Settings could not be saved. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SettingsLoadingState message="Loading gym settings…" />;
  if (loadError) return <SettingsErrorState message={loadError} onRetry={() => { setLoading(true); setLoadError(''); setReloadKey((value) => value + 1); }} />;

  const fieldError = (field: keyof GymSettingsValues) => fieldErrors[field];
  const accessProps = canEdit ? {} : { readOnly: true, 'aria-readonly': true as const };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className={`rounded-xl border p-4 text-sm ${canEdit ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <p className="font-semibold">{canEdit ? 'Administrator access' : 'View-only access'}</p>
        <p className="mt-1">{canEdit ? 'Changes apply across the gym management system.' : 'Staff can view the gym profile, but only an Admin can make changes.'}</p>
      </div>

      {message && (
        <div role={message.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <SettingsSection title="Gym profile" description="Core identity and contact information shown across your operations.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="gymName" className="text-sm font-semibold text-gray-700">Gym name <span className="text-red-600">*</span></label>
            <input id="gymName" value={values.gymName} onChange={(event) => update('gymName', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('gymName'))} aria-describedby={fieldError('gymName') ? 'gymName-error' : undefined} className={inputClass} />
            {fieldError('gymName') && <p id="gymName-error" className="mt-1.5 text-sm text-red-700">{fieldError('gymName')}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="logo" className="text-sm font-semibold text-gray-700">Logo URL or path</label>
            <input id="logo" value={values.logo} onChange={(event) => update('logo', event.target.value)} disabled={saving} {...accessProps} placeholder="/images/gym-logo.png" aria-invalid={Boolean(fieldError('logo'))} aria-describedby="logo-help logo-error" className={inputClass} />
            <p id="logo-help" className="mt-1.5 text-xs text-gray-500">HTTP(S) URL or stored application path. Image upload is not available yet.</p>
            {fieldError('logo') && <p id="logo-error" className="mt-1 text-sm text-red-700">{fieldError('logo')}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="text-sm font-semibold text-gray-700">Address</label>
            <textarea id="address" rows={3} value={values.address} onChange={(event) => update('address', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('address'))} aria-describedby={fieldError('address') ? 'address-error' : undefined} className={inputClass} />
            {fieldError('address') && <p id="address-error" className="mt-1.5 text-sm text-red-700">{fieldError('address')}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone</label>
            <input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('phone'))} aria-describedby={fieldError('phone') ? 'phone-error' : undefined} className={inputClass} />
            {fieldError('phone') && <p id="phone-error" className="mt-1.5 text-sm text-red-700">{fieldError('phone')}</p>}
          </div>
          <div>
            <label htmlFor="gymEmail" className="text-sm font-semibold text-gray-700">Email</label>
            <input id="gymEmail" type="email" autoComplete="email" value={values.email} onChange={(event) => update('email', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('email'))} aria-describedby={fieldError('email') ? 'gymEmail-error' : undefined} className={inputClass} />
            {fieldError('email') && <p id="gymEmail-error" className="mt-1.5 text-sm text-red-700">{fieldError('email')}</p>}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Regional and operating settings" description="Currency, timezone, daily hours, and membership expiry reminders.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="currency" className="text-sm font-semibold text-gray-700">Currency</label>
            <select id="currency" value={values.currency} onChange={(event) => update('currency', event.target.value as 'INR')} disabled={!canEdit || saving} className={inputClass}>
              <option value="INR">INR — Indian Rupee</option>
            </select>
          </div>
          <div>
            <label htmlFor="timezone" className="text-sm font-semibold text-gray-700">Timezone</label>
            <select id="timezone" value={values.timezone} onChange={(event) => update('timezone', event.target.value as 'Asia/Kolkata')} disabled={!canEdit || saving} aria-describedby="timezone-help" className={inputClass}>
              <option value="Asia/Kolkata">Asia/Kolkata — India Standard Time</option>
            </select>
            <p id="timezone-help" className="mt-1.5 text-xs text-gray-500">Dates and reports use this explicit gym timezone.</p>
          </div>
          <div>
            <label htmlFor="openingTime" className="text-sm font-semibold text-gray-700">Opening time</label>
            <input id="openingTime" type="time" value={values.openingTime} onChange={(event) => update('openingTime', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('openingTime'))} aria-describedby={fieldError('openingTime') ? 'openingTime-error' : undefined} className={inputClass} />
            {fieldError('openingTime') && <p id="openingTime-error" className="mt-1.5 text-sm text-red-700">{fieldError('openingTime')}</p>}
          </div>
          <div>
            <label htmlFor="closingTime" className="text-sm font-semibold text-gray-700">Closing time</label>
            <input id="closingTime" type="time" value={values.closingTime} onChange={(event) => update('closingTime', event.target.value)} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('closingTime'))} aria-describedby={fieldError('closingTime') ? 'closingTime-error' : undefined} className={inputClass} />
            {fieldError('closingTime') && <p id="closingTime-error" className="mt-1.5 text-sm text-red-700">{fieldError('closingTime')}</p>}
          </div>
          <div className="sm:col-span-2 sm:max-w-sm">
            <label htmlFor="membershipExpiryWarningDays" className="text-sm font-semibold text-gray-700">Membership expiry warning days</label>
            <input id="membershipExpiryWarningDays" type="number" min={0} max={365} step={1} value={values.membershipExpiryWarningDays} onChange={(event) => update('membershipExpiryWarningDays', Number(event.target.value))} disabled={saving} {...accessProps} aria-invalid={Boolean(fieldError('membershipExpiryWarningDays'))} aria-describedby="expiry-help expiry-error" className={inputClass} />
            <p id="expiry-help" className="mt-1.5 text-xs text-gray-500">Show upcoming expiry warnings this many days in advance (0–365).</p>
            {fieldError('membershipExpiryWarningDays') && <p id="expiry-error" className="mt-1 text-sm text-red-700">{fieldError('membershipExpiryWarningDays')}</p>}
          </div>
        </div>
      </SettingsSection>

      {canEdit && (
        <div className="sticky bottom-0 z-10 flex justify-end rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {saving ? 'Saving settings…' : 'Save gym settings'}
          </button>
        </div>
      )}
    </form>
  );
}
