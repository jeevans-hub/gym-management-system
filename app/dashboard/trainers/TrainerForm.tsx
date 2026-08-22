'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TrainerFormValues, TrainerRecord } from './types';

type FormErrors = Partial<Record<keyof TrainerFormValues, string>>;

interface TrainerFormProps {
  mode: 'create' | 'edit';
  initialValues: TrainerFormValues;
  trainerId?: string;
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500';
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_IMAGE_PATTERN = /^(?:https?:\/\/|\/{1,2}|\.{1,2}\/)/i;

function normalizedPhone(value: string) {
  return value.trim().replace(/[\s().-]/g, '');
}

function validate(values: TrainerFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  else if (values.firstName.trim().length > 100) errors.firstName = 'First name cannot exceed 100 characters.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  else if (values.lastName.trim().length > 100) errors.lastName = 'Last name cannot exceed 100 characters.';
  if (!values.phone.trim()) errors.phone = 'Phone is required.';
  else if (!PHONE_PATTERN.test(normalizedPhone(values.phone))) errors.phone = 'Enter 7 to 15 digits, optionally starting with +.';
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.specialization.trim()) errors.specialization = 'Specialization is required.';
  else if (values.specialization.trim().length > 100) errors.specialization = 'Specialization cannot exceed 100 characters.';

  const experience = Number(values.experienceYears);
  if (!values.experienceYears.trim() || !Number.isFinite(experience)) errors.experienceYears = 'Enter a valid number of years.';
  else if (experience < 0 || experience > 80) errors.experienceYears = 'Experience must be between 0 and 80 years.';

  if (!values.joiningDate) errors.joiningDate = 'Joining date is required.';
  else if (Number.isNaN(new Date(`${values.joiningDate}T00:00:00`).getTime())) errors.joiningDate = 'Enter a valid joining date.';

  if (values.salary.trim()) {
    const salary = Number(values.salary);
    if (!Number.isFinite(salary)) errors.salary = 'Enter a valid salary.';
    else if (salary < 0 || salary > 100_000_000) errors.salary = 'Salary must be between 0 and 100,000,000.';
    else if (Math.abs(salary * 100 - Math.round(salary * 100)) >= 1e-8) errors.salary = 'Salary cannot have more than two decimal places.';
  }

  if (values.emergencyContactPhone.trim() && !PHONE_PATTERN.test(normalizedPhone(values.emergencyContactPhone))) {
    errors.emergencyContactPhone = 'Enter 7 to 15 digits, optionally starting with +.';
  }
  if (values.address.trim().length > 500) errors.address = 'Address cannot exceed 500 characters.';
  if (values.emergencyContactName.trim().length > 100) errors.emergencyContactName = 'Contact name cannot exceed 100 characters.';
  if (values.profileImage.trim() && !PROFILE_IMAGE_PATTERN.test(values.profileImage.trim())) {
    errors.profileImage = 'Enter an http(s) URL or a web path.';
  }
  if (values.profileImage.trim().length > 2048) errors.profileImage = 'Profile image path cannot exceed 2048 characters.';
  if (values.notes.trim().length > 1000) errors.notes = 'Notes cannot exceed 1000 characters.';
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export default function TrainerForm({ mode, initialValues, trainerId }: TrainerFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isEdit = mode === 'edit';
  const cancelHref = isEdit && trainerId
    ? `/dashboard/trainers/${encodeURIComponent(trainerId)}`
    : '/dashboard/trainers';

  function updateField<K extends keyof TrainerFormValues>(field: K, value: TrainerFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setApiError('');
    if (Object.keys(nextErrors).length) {
      const firstInvalidName = Object.keys(nextErrors)[0];
      const firstInvalid = event.currentTarget.elements.namedItem(firstInvalidName);
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    const endpoint = isEdit && trainerId
      ? `/api/trainers/${encodeURIComponent(trainerId)}`
      : '/api/trainers';
    const payload: Record<string, unknown> = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      gender: values.gender || (isEdit ? null : undefined),
      specialization: values.specialization,
      experienceYears: Number(values.experienceYears),
      joiningDate: values.joiningDate,
      salary: values.salary.trim() ? Number(values.salary) : (isEdit ? null : undefined),
      status: values.status,
      address: values.address,
      emergencyContactName: values.emergencyContactName,
      emergencyContactPhone: values.emergencyContactPhone,
      profileImage: values.profileImage,
      notes: values.notes,
    };

    try {
      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }

      const result = await response.json().catch(() => null) as {
        error?: string;
        details?: string[];
        trainer?: TrainerRecord;
      } | null;

      if (!response.ok) {
        if (response.status === 409) setApiError('A trainer with this email already exists.');
        else if (response.status === 404) setApiError('This trainer no longer exists.');
        else if (result?.details?.length) setApiError(result.details.join(' '));
        else setApiError(result?.error || `The trainer could not be ${isEdit ? 'updated' : 'created'}. Please try again.`);
        return;
      }

      const publicId = result?.trainer?.trainerId || trainerId;
      if (!publicId) {
        router.push('/dashboard/trainers');
        return;
      }
      router.push(`/dashboard/trainers/${encodeURIComponent(publicId)}?${isEdit ? 'updated' : 'created'}=1`);
    } catch {
      setApiError(`The trainer could not be ${isEdit ? 'updated' : 'created'}. Check your connection and try again.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const errorFor = (field: keyof TrainerFormValues) => errors[field];

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
          <p className="mt-1 text-sm text-gray-500">Identity and contact details for the trainer directory.</p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First name <span className="text-red-600">*</span></label>
            <input id="firstName" name="firstName" autoComplete="given-name" maxLength={100} value={values.firstName} onChange={(event) => updateField('firstName', event.target.value)} aria-invalid={Boolean(errorFor('firstName'))} aria-describedby={errorFor('firstName') ? 'firstName-error' : undefined} className={inputClass} />
            <FieldError id="firstName-error" message={errorFor('firstName')} />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last name <span className="text-red-600">*</span></label>
            <input id="lastName" name="lastName" autoComplete="family-name" maxLength={100} value={values.lastName} onChange={(event) => updateField('lastName', event.target.value)} aria-invalid={Boolean(errorFor('lastName'))} aria-describedby={errorFor('lastName') ? 'lastName-error' : undefined} className={inputClass} />
            <FieldError id="lastName-error" message={errorFor('lastName')} />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errorFor('email'))} aria-describedby={errorFor('email') ? 'email-error' : undefined} placeholder="trainer@example.com" className={inputClass} />
            <FieldError id="email-error" message={errorFor('email')} />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone <span className="text-red-600">*</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(event) => updateField('phone', event.target.value)} aria-invalid={Boolean(errorFor('phone'))} aria-describedby={errorFor('phone') ? 'phone-error' : undefined} placeholder="+91 98765 43210" className={inputClass} />
            <FieldError id="phone-error" message={errorFor('phone')} />
          </div>
          <div>
            <label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</label>
            <select id="gender" name="gender" value={values.gender} onChange={(event) => updateField('gender', event.target.value as TrainerFormValues['gender'])} className={inputClass}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className="text-sm font-medium text-gray-700">Address</label>
            <textarea id="address" name="address" autoComplete="street-address" rows={3} maxLength={500} value={values.address} onChange={(event) => updateField('address', event.target.value)} aria-invalid={Boolean(errorFor('address'))} aria-describedby={errorFor('address') ? 'address-error' : undefined} className={inputClass} />
            <FieldError id="address-error" message={errorFor('address')} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profileImage" className="text-sm font-medium text-gray-700">Profile image URL or path</label>
            <input id="profileImage" name="profileImage" maxLength={2048} value={values.profileImage} onChange={(event) => updateField('profileImage', event.target.value)} aria-invalid={Boolean(errorFor('profileImage'))} aria-describedby={errorFor('profileImage') ? 'profileImage-error profileImage-help' : 'profileImage-help'} placeholder="https://example.com/trainer-photo.jpg" className={inputClass} />
            <p id="profileImage-help" className="mt-1.5 text-xs text-gray-500">URL or stored web path only. File uploads are not available.</p>
            <FieldError id="profileImage-error" message={errorFor('profileImage')} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Professional record</h2>
          <p className="mt-1 text-sm text-gray-500">Specialization, experience, joining date and employment status.</p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="specialization" className="text-sm font-medium text-gray-700">Specialization <span className="text-red-600">*</span></label>
            <input id="specialization" name="specialization" maxLength={100} list="trainer-specializations" value={values.specialization} onChange={(event) => updateField('specialization', event.target.value)} aria-invalid={Boolean(errorFor('specialization'))} aria-describedby={errorFor('specialization') ? 'specialization-error' : undefined} placeholder="Strength Training" className={inputClass} />
            <datalist id="trainer-specializations">
              {['Strength Training', 'Cardio', 'CrossFit', 'Yoga', 'Weight Loss', 'Bodybuilding', 'Functional Training'].map((item) => <option key={item} value={item} />)}
            </datalist>
            <FieldError id="specialization-error" message={errorFor('specialization')} />
          </div>
          <div>
            <label htmlFor="experienceYears" className="text-sm font-medium text-gray-700">Experience years <span className="text-red-600">*</span></label>
            <input id="experienceYears" name="experienceYears" type="number" min="0" max="80" step="0.1" inputMode="decimal" value={values.experienceYears} onChange={(event) => updateField('experienceYears', event.target.value)} aria-invalid={Boolean(errorFor('experienceYears'))} aria-describedby={errorFor('experienceYears') ? 'experienceYears-error' : undefined} className={inputClass} />
            <FieldError id="experienceYears-error" message={errorFor('experienceYears')} />
          </div>
          <div>
            <label htmlFor="joiningDate" className="text-sm font-medium text-gray-700">Joining date <span className="text-red-600">*</span></label>
            <input id="joiningDate" name="joiningDate" type="date" value={values.joiningDate} onChange={(event) => updateField('joiningDate', event.target.value)} aria-invalid={Boolean(errorFor('joiningDate'))} aria-describedby={errorFor('joiningDate') ? 'joiningDate-error' : undefined} className={inputClass} />
            <FieldError id="joiningDate-error" message={errorFor('joiningDate')} />
          </div>
          <div>
            <label htmlFor="salary" className="text-sm font-medium text-gray-700">Salary (INR)</label>
            <input id="salary" name="salary" type="number" min="0" max="100000000" step="0.01" inputMode="decimal" value={values.salary} onChange={(event) => updateField('salary', event.target.value)} aria-invalid={Boolean(errorFor('salary'))} aria-describedby={errorFor('salary') ? 'salary-error' : undefined} placeholder="25000.00" className={inputClass} />
            <FieldError id="salary-error" message={errorFor('salary')} />
          </div>
          <div>
            <label htmlFor="status" className="text-sm font-medium text-gray-700">Status <span className="text-red-600">*</span></label>
            <select id="status" name="status" value={values.status} onChange={(event) => updateField('status', event.target.value as TrainerFormValues['status'])} className={inputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            <input id="emergencyContactName" name="emergencyContactName" maxLength={100} value={values.emergencyContactName} onChange={(event) => updateField('emergencyContactName', event.target.value)} aria-invalid={Boolean(errorFor('emergencyContactName'))} aria-describedby={errorFor('emergencyContactName') ? 'emergencyContactName-error' : undefined} className={inputClass} />
            <FieldError id="emergencyContactName-error" message={errorFor('emergencyContactName')} />
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
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <p className="mt-1 text-sm text-gray-500">Optional internal context about this trainer.</p>
        </div>
        <div className="mt-5">
          <label htmlFor="notes" className="sr-only">Trainer notes</label>
          <textarea id="notes" name="notes" rows={4} maxLength={1000} value={values.notes} onChange={(event) => updateField('notes', event.target.value)} aria-invalid={Boolean(errorFor('notes'))} aria-describedby={errorFor('notes') ? 'notes-error' : undefined} placeholder="Certifications, availability notes or other context" className={inputClass} />
          <div className="mt-1.5 flex justify-between gap-3">
            <FieldError id="notes-error" message={errorFor('notes')} />
            <span className="ml-auto text-xs text-gray-400">{values.notes.length}/1000</span>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? (isEdit ? 'Saving changes…' : 'Adding trainer…') : (isEdit ? 'Save changes' : 'Add trainer')}
        </button>
      </div>
    </form>
  );
}
