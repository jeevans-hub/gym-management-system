'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SetupValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type SetupErrors = Partial<Record<keyof SetupValues, string>>;

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100';

function validate(values: SetupValues): SetupErrors {
  const errors: SetupErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Enter an administrator name of at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.password.length < 10 || values.password.length > 128 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Use 10–128 characters with at least one letter and one number.';
  }
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm the password.';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export default function SetupPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [values, setValues] = useState<SetupValues>({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<SetupErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/setup/status', { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { requiresSetup?: boolean };
        if (!data.requiresSetup) {
          router.replace('/login');
          return;
        }
        setChecking(false);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSubmitError('Setup status could not be checked. Refresh the page to try again.');
          setChecking(false);
        }
      }
    })();
    return () => controller.abort();
  }, [router]);

  function updateField(field: keyof SetupValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name.trim(), email: values.email.trim(), password: values.password }),
      });
      const data = await response.json().catch(() => null) as { details?: string[] } | null;
      if (response.ok) {
        setValues((current) => ({ ...current, password: '', confirmPassword: '' }));
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      if (response.status === 409) {
        setSubmitError('Setup has already been completed. Sign in with an administrator account.');
      } else if (response.status === 400) {
        setSubmitError(data?.details?.[0] || 'Review the highlighted details and try again.');
      } else {
        setSubmitError('The administrator account could not be created. Please try again.');
      }
    } catch {
      setSubmitError('Setup is temporarily unavailable. Check your connection and try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
        <p role="status" className="rounded-xl bg-white px-5 py-4 text-sm font-medium text-gray-700 shadow-lg">Checking setup status…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/20">G</div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Initial setup</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">Set up your gym</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">Create the first administrator account. This one-time account controls settings and staff access.</p>
        </div>

        <section aria-labelledby="setup-form-heading" className="mt-8 rounded-2xl border border-white/70 bg-white p-6 shadow-xl sm:p-8">
          <h2 id="setup-form-heading" className="text-xl font-bold text-gray-950">Administrator details</h2>
          <p className="mt-1 text-sm text-gray-500">The first user is always created as an Admin.</p>

          {submitError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>}

          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="setup-name" className="block text-sm font-semibold text-gray-700">Admin name</label>
              <input id="setup-name" name="name" autoComplete="name" value={values.name} onChange={(event) => updateField('name', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'setup-name-error' : undefined} className={inputClass} />
              {errors.name && <p id="setup-name-error" role="alert" className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="setup-email" className="block text-sm font-semibold text-gray-700">Email address</label>
              <input id="setup-email" name="email" type="email" autoComplete="email" value={values.email} onChange={(event) => updateField('email', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'setup-email-error' : undefined} className={inputClass} />
              {errors.email && <p id="setup-email-error" role="alert" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="setup-password" className="block text-sm font-semibold text-gray-700">Password</label>
              <input id="setup-password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={(event) => updateField('password', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.password)} aria-describedby="setup-password-help setup-password-error" className={inputClass} />
              <p id="setup-password-help" className="mt-1.5 text-xs leading-5 text-gray-500">Use 10–128 characters with at least one letter and one number.</p>
              {errors.password && <p id="setup-password-error" role="alert" className="mt-1 text-sm text-red-700">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="setup-confirm-password" className="block text-sm font-semibold text-gray-700">Confirm password</label>
              <input id="setup-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'setup-confirm-error' : undefined} className={inputClass} />
              {errors.confirmPassword && <p id="setup-confirm-error" role="alert" className="mt-1.5 text-sm text-red-700">{errors.confirmPassword}</p>}
            </div>
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Creating administrator…' : 'Create administrator'}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-gray-500">Already set up? <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500">Return to sign in</Link></p>
      </div>
    </main>
  );
}
