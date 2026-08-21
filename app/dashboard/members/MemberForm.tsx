'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberFormValues, MemberRecord } from './types';

type FormErrors = Partial<Record<keyof MemberFormValues, string>>;

interface MemberFormProps {
  mode: 'create' | 'edit';
  initialValues: MemberFormValues;
  memberId?: string;
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500';
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizedPhone(value: string) {
  return value.trim().replace(/[\s().-]/g, '');
}

function validate(values: MemberFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.phone.trim()) errors.phone = 'Phone is required.';
  else if (!PHONE_PATTERN.test(normalizedPhone(values.phone))) errors.phone = 'Enter 7 to 15 digits, optionally starting with +.';
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.emergencyContactPhone.trim() && !PHONE_PATTERN.test(normalizedPhone(values.emergencyContactPhone))) {
    errors.emergencyContactPhone = 'Enter 7 to 15 digits, optionally starting with +.';
  }
  if (!values.joiningDate) errors.joiningDate = 'Joining date is required.';
  if (values.dateOfBirth) {
    const birthDate = new Date(`${values.dateOfBirth}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) errors.dateOfBirth = 'Enter a valid date of birth.';
    else if (birthDate > new Date()) errors.dateOfBirth = 'Date of birth cannot be in the future.';
  }
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export default function MemberForm({ mode, initialValues, memberId }: MemberFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const cancelHref = isEdit && memberId
    ? `/dashboard/members/${encodeURIComponent(memberId)}`
    : '/dashboard/members';

  function updateField<K extends keyof MemberFormValues>(field: K, value: MemberFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setApiError('');
    if (Object.keys(nextErrors).length) {
      const firstInvalidName = Object.keys(nextErrors)[0];
      const firstInvalid = event.currentTarget.elements.namedItem(firstInvalidName);
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      return;
    }

    setSubmitting(true);
    const endpoint = isEdit && memberId
      ? `/api/members/${encodeURIComponent(memberId)}`
      : '/api/members';

    try {
      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(values),
      });

      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }

      const result = await response.json().catch(() => null) as {
        error?: string;
        details?: string[];
        member?: MemberRecord;
      } | null;

      if (!response.ok) {
        if (response.status === 409) setApiError('A member with this email already exists.');
        else if (response.status === 404) setApiError('This member no longer exists.');
        else if (result?.details?.length) setApiError(result.details.join(' '));
        else setApiError(result?.error || `The member could not be ${isEdit ? 'updated' : 'created'}. Please try again.`);
        return;
      }

      const publicId = result?.member?.memberId || memberId;
      if (!publicId) {
        router.push('/dashboard/members');
        return;
      }
      router.push(`/dashboard/members/${encodeURIComponent(publicId)}?${isEdit ? 'updated' : 'created'}=1`);
    } catch {
      setApiError(`The member could not be ${isEdit ? 'updated' : 'created'}. Check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  const errorFor = (field: keyof MemberFormValues) => errors[field];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Personal information</h2>
          <p className="mt-1 text-sm text-gray-500">Basic identity and contact details for the member.</p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First name <span className="text-red-600">*</span></label>
            <input id="firstName" name="firstName" autoComplete="given-name" value={values.firstName} onChange={(event) => updateField('firstName', event.target.value)} aria-invalid={Boolean(errorFor('firstName'))} aria-describedby={errorFor('firstName') ? 'firstName-error' : undefined} className={inputClass} />
            <FieldError id="firstName-error" message={errorFor('firstName')} />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last name <span className="text-red-600">*</span></label>
            <input id="lastName" name="lastName" autoComplete="family-name" value={values.lastName} onChange={(event) => updateField('lastName', event.target.value)} aria-invalid={Boolean(errorFor('lastName'))} aria-describedby={errorFor('lastName') ? 'lastName-error' : undefined} className={inputClass} />
            <FieldError id="lastName-error" message={errorFor('lastName')} />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" value={values.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errorFor('email'))} aria-describedby={errorFor('email') ? 'email-error' : undefined} placeholder="member@example.com" className={inputClass} />
            <FieldError id="email-error" message={errorFor('email')} />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone <span className="text-red-600">*</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(event) => updateField('phone', event.target.value)} aria-invalid={Boolean(errorFor('phone'))} aria-describedby={errorFor('phone') ? 'phone-error' : undefined} placeholder="+91 98765 43210" className={inputClass} />
            <FieldError id="phone-error" message={errorFor('phone')} />
          </div>
          <div>
            <label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</label>
            <select id="gender" name="gender" value={values.gender} onChange={(event) => updateField('gender', event.target.value as MemberFormValues['gender'])} className={inputClass}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">Date of birth</label>
            <input id="dateOfBirth" name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} aria-invalid={Boolean(errorFor('dateOfBirth'))} aria-describedby={errorFor('dateOfBirth') ? 'dateOfBirth-error' : undefined} className={inputClass} />
            <FieldError id="dateOfBirth-error" message={errorFor('dateOfBirth')} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="text-sm font-medium text-gray-700">Address</label>
            <textarea id="address" name="address" autoComplete="street-address" rows={3} value={values.address} onChange={(event) => updateField('address', event.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profileImage" className="text-sm font-medium text-gray-700">Profile image URL or path</label>
            <input id="profileImage" name="profileImage" value={values.profileImage} onChange={(event) => updateField('profileImage', event.target.value)} placeholder="https://example.com/member-photo.jpg" className={inputClass} />
            <p className="mt-1.5 text-xs text-gray-500">URL or stored path only. File uploads are not available yet.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Emergency contact</h2>
          <p className="mt-1 text-sm text-gray-500">Optional contact information for urgent situations.</p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="emergencyContactName" className="text-sm font-medium text-gray-700">Contact name</label>
            <input id="emergencyContactName" name="emergencyContactName" value={values.emergencyContactName} onChange={(event) => updateField('emergencyContactName', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="emergencyContactPhone" className="text-sm font-medium text-gray-700">Contact phone</label>
            <input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" value={values.emergencyContactPhone} onChange={(event) => updateField('emergencyContactPhone', event.target.value)} aria-invalid={Boolean(errorFor('emergencyContactPhone'))} aria-describedby={errorFor('emergencyContactPhone') ? 'emergencyContactPhone-error' : undefined} className={inputClass} />
            <FieldError id="emergencyContactPhone-error" message={errorFor('emergencyContactPhone')} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Member record</h2>
          <p className="mt-1 text-sm text-gray-500">Joining date and current account status.</p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="joiningDate" className="text-sm font-medium text-gray-700">Joining date <span className="text-red-600">*</span></label>
            <input id="joiningDate" name="joiningDate" type="date" value={values.joiningDate} onChange={(event) => updateField('joiningDate', event.target.value)} aria-invalid={Boolean(errorFor('joiningDate'))} aria-describedby={errorFor('joiningDate') ? 'joiningDate-error' : undefined} className={inputClass} />
            <FieldError id="joiningDate-error" message={errorFor('joiningDate')} />
          </div>
          <div>
            <label htmlFor="status" className="text-sm font-medium text-gray-700">Status <span className="text-red-600">*</span></label>
            <select id="status" name="status" value={values.status} onChange={(event) => updateField('status', event.target.value as MemberFormValues['status'])} className={inputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? (isEdit ? 'Saving changes…' : 'Adding member…') : (isEdit ? 'Save changes' : 'Add member')}
        </button>
      </div>
    </form>
  );
}
