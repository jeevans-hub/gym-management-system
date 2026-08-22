'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserRoleBadge from './UserRoleBadge';
import type { AdminUser, AdminUserDialogMode } from './types';

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

type FormErrors = Partial<Record<keyof UserFormValues, string>>;

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100';
const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function validate(values: UserFormValues, mode: AdminUserDialogMode): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Enter a name of at least 2 characters.';
  else if (values.name.trim().length > 100) errors.name = 'Use 100 characters or fewer.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (mode === 'create' && (values.password.length < 10 || values.password.length > 128 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password))) {
    errors.password = 'Use 10–128 characters with at least one letter and one number.';
  }
  if (!['admin', 'staff'].includes(values.role)) errors.role = 'Choose Admin or Staff.';
  return errors;
}

export default function AdminUserDialog({
  mode,
  user,
  onClose,
  onSaved,
}: {
  mode: AdminUserDialogMode;
  user?: AdminUser;
  onClose: () => void;
  onSaved: (user: AdminUser, message: string) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [values, setValues] = useState<UserFormValues>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'staff',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (mode === 'view') closeButtonRef.current?.focus();
    else firstFieldRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [mode, onClose]);

  function update<K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || mode === 'view') return;
    const nextErrors = validate(values, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch(mode === 'create' ? '/api/admin/users' : `/api/admin/users/${encodeURIComponent(user?.id ?? '')}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'create'
          ? { name: values.name.trim(), email: values.email.trim(), password: values.password, role: values.role }
          : { name: values.name.trim(), email: values.email.trim(), role: values.role }),
      });

      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }
      const data = await response.json().catch(() => null) as { user?: AdminUser; error?: string; details?: string[] } | null;
      if (!response.ok || !data?.user) {
        if (response.status === 403) setSubmitError('Administrator access is required to manage users.');
        else if (response.status === 404) setSubmitError('This user no longer exists. Close the dialog and refresh the list.');
        else if (response.status === 409 && data?.error?.toLowerCase().includes('last remaining')) setSubmitError('At least one Admin must remain. The last administrator cannot be demoted.');
        else if (response.status === 409) setSubmitError('A user with this email already exists.');
        else if (response.status === 400) setSubmitError(data?.details?.[0] || 'Review the user details and try again.');
        else setSubmitError('The user could not be saved. Please try again.');
        return;
      }

      setValues((current) => ({ ...current, password: '' }));
      onSaved(data.user, mode === 'create' ? 'User created successfully.' : 'User updated successfully.');
    } catch {
      setSubmitError('The user could not be saved. Check your connection and try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const title = mode === 'create' ? 'Add user' : mode === 'edit' ? 'Edit user' : 'User details';
  const description = mode === 'create'
    ? 'Create an Admin or Staff account.'
    : mode === 'edit'
      ? 'Update identity and access role. Password changes are not available here.'
      : 'Review this user’s account and access level.';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingRef.current) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title" aria-describedby="admin-user-dialog-description" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="admin-user-dialog-title" className="text-xl font-bold text-gray-950">{title}</h2>
            <p id="admin-user-dialog-description" className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={submitting} aria-label={`Close ${title.toLowerCase()} dialog`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">✕</button>
        </div>

        {mode === 'view' && user ? (
          <div className="mt-6">
            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4">
              <div className="py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt><dd className="mt-1 font-semibold text-gray-950">{user.name}</dd></div>
              <div className="py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt><dd className="mt-1 break-all text-sm text-gray-700">{user.email}</dd></div>
              <div className="py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</dt><dd className="mt-2"><UserRoleBadge role={user.role} /></dd></div>
              <div className="py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</dt><dd className="mt-1 text-sm text-gray-700">{formatDate(user.createdAt)}</dd></div>
              <div className="py-4"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last updated</dt><dd className="mt-1 text-sm text-gray-700">{formatDate(user.updatedAt)}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">Close</button></div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            {submitError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{submitError}</div>}
            <div>
              <label htmlFor="admin-user-name" className="text-sm font-semibold text-gray-700">Name</label>
              <input ref={firstFieldRef} id="admin-user-name" autoComplete="name" value={values.name} onChange={(event) => update('name', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'admin-user-name-error' : undefined} className={inputClass} />
              {errors.name && <p id="admin-user-name-error" className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="admin-user-email" className="text-sm font-semibold text-gray-700">Email address</label>
              <input id="admin-user-email" type="email" autoComplete="email" value={values.email} onChange={(event) => update('email', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'admin-user-email-error' : undefined} className={inputClass} />
              {errors.email && <p id="admin-user-email-error" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
            </div>
            {mode === 'create' && (
              <div>
                <label htmlFor="admin-user-password" className="text-sm font-semibold text-gray-700">Temporary password</label>
                <input id="admin-user-password" type="password" autoComplete="new-password" value={values.password} onChange={(event) => update('password', event.target.value)} disabled={submitting} aria-invalid={Boolean(errors.password)} aria-describedby="admin-user-password-help admin-user-password-error" className={inputClass} />
                <p id="admin-user-password-help" className="mt-1.5 text-xs leading-5 text-gray-500">Use 10–128 characters with at least one letter and one number. It will not be displayed after creation.</p>
                {errors.password && <p id="admin-user-password-error" className="mt-1 text-sm text-red-700">{errors.password}</p>}
              </div>
            )}
            <div>
              <label htmlFor="admin-user-role" className="text-sm font-semibold text-gray-700">Role</label>
              <select id="admin-user-role" value={values.role} onChange={(event) => update('role', event.target.value as 'admin' | 'staff')} disabled={submitting} aria-describedby="admin-user-role-help" className={inputClass}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <p id="admin-user-role-help" className="mt-1.5 text-xs leading-5 text-gray-500">At least one Admin must remain. Staff cannot administer users or change gym settings.</p>
            </div>
            {mode === 'edit' && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">Password management is intentionally unavailable in this phase because no dedicated password-change API exists.</p>}
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Saving user…' : mode === 'create' ? 'Add user' : 'Save changes'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
