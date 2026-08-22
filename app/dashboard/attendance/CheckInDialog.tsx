'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatGymTime, memberName } from './attendance-format';
import type {
  AttendanceRecord,
  MemberMembershipResponse,
  MemberSearchRecord,
  MemberSearchResponse,
} from './types';

type Eligibility =
  | { state: 'idle' | 'loading' }
  | { state: 'eligible'; message: string }
  | { state: 'already'; message: string }
  | { state: 'expired' | 'cancelled' | 'none'; message: string }
  | { state: 'error'; message: string };

const inputClass = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100';

export default function CheckInDialog({
  currentRecords,
  onClose,
  onSuccess,
}: {
  currentRecords: AttendanceRecord[];
  onClose: () => void;
  onSuccess: (attendance: AttendanceRecord) => void;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MemberSearchRecord[]>([]);
  const [selected, setSelected] = useState<MemberSearchRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [eligibility, setEligibility] = useState<Eligibility>({ state: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const checkedInIds = useMemo(
    () => new Set(currentRecords.map((record) => record.member.memberId)),
    [currentRecords]
  );

  useEffect(() => {
    searchRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, submitting]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/members?search=${encodeURIComponent(trimmed)}&status=active&limit=8`, {
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json() as MemberSearchResponse;
        setMembers(data.members);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSearchError('Members could not be searched. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, router]);

  async function selectMember(member: MemberSearchRecord) {
    setSelected(member);
    setSubmitError('');
    if (checkedInIds.has(member.memberId)) {
      const record = currentRecords.find((item) => item.member.memberId === member.memberId);
      setEligibility({
        state: 'already',
        message: `Already checked in today${record ? ` at ${formatGymTime(record.checkInAt)}` : ''}.`,
      });
      return;
    }

    setEligibility({ state: 'loading' });
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(member.memberId)}/memberships?limit=1`);
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json() as MemberMembershipResponse;
      if (data.currentMembership) {
        setEligibility({
          state: 'eligible',
          message: `Active ${data.currentMembership.plan.name} membership. Final eligibility is verified at check-in.`,
        });
        return;
      }
      const latest = data.memberships[0];
      if (latest?.status === 'expired') {
        setEligibility({ state: 'expired', message: 'The latest membership has expired.' });
      } else if (latest?.status === 'cancelled') {
        setEligibility({ state: 'cancelled', message: 'The latest membership was cancelled.' });
      } else {
        setEligibility({ state: 'none', message: 'No active membership was found.' });
      }
    } catch {
      setEligibility({
        state: 'error',
        message: 'Membership eligibility could not be pre-checked. The server will verify it at check-in.',
      });
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selected.memberId, notes: notes.trim() }),
      });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await response.json().catch(() => null) as { error?: string; attendance?: AttendanceRecord } | null;
      if (!response.ok || !data?.attendance) {
        if (response.status === 404) setSubmitError('This member no longer exists. Search and select them again.');
        else if (response.status === 409 && data?.error?.includes('already checked in')) {
          setSubmitError('This member is already checked in for today.');
          setEligibility({ state: 'already', message: 'Already checked in today.' });
        } else if (response.status === 409) {
          setSubmitError('This member cannot check in because they do not have an active, current membership.');
        } else setSubmitError('The member could not be checked in. Please try again.');
        return;
      }
      onSuccess(data.attendance);
    } catch {
      setSubmitError('The member could not be checked in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = selected && !submitting && !['loading', 'already', 'expired', 'cancelled', 'none'].includes(eligibility.state);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="check-in-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="check-in-title" className="text-xl font-bold text-gray-900">Check In Member</h2><p className="mt-1 text-sm text-gray-500">Find a member and confirm their arrival. Gym time is recorded automatically.</p></div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close check-in dialog" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">✕</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="member-search" className="text-sm font-semibold text-gray-700">Search members</label>
            <input ref={searchRef} id="member-search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setEligibility({ state: 'idle' }); setSubmitError(''); if (event.target.value.trim().length < 2) setMembers([]); }} placeholder="Member ID, name, or phone" autoComplete="off" className={inputClass} />
            <p className="mt-1.5 text-xs text-gray-500">Enter at least 2 characters. Results are loaded from the server.</p>
            {searching && <p role="status" className="mt-3 text-sm text-blue-700">Searching members…</p>}
            {searchError && <p role="alert" className="mt-3 text-sm text-red-700">{searchError}</p>}
            {!searching && query.trim().length >= 2 && members.length === 0 && !searchError && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No active members found.</p>}
            {members.length > 0 && (
              <div role="listbox" aria-label="Member search results" className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {members.map((member) => (
                  <button key={member.memberId} type="button" role="option" aria-selected={selected?.memberId === member.memberId} onClick={() => void selectMember(member)} className={`w-full rounded-lg border p-3 text-left outline-none transition focus:ring-2 focus:ring-blue-500 ${selected?.memberId === member.memberId ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}>
                    <span className="block font-semibold text-gray-900">{memberName(member)}</span>
                    <span className="mt-1 block text-xs text-gray-500"><span className="font-mono font-semibold text-blue-700">{member.memberId}</span> · {member.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <section aria-labelledby="selected-member" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 id="selected-member" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected member</h3>
              <p className="mt-2 font-bold text-gray-900">{memberName(selected)}</p>
              <p className="mt-1 text-sm text-gray-600">{selected.memberId} · {selected.phone}</p>
            </section>
          )}

          {eligibility.state !== 'idle' && (
            <div aria-live="polite" className={`rounded-lg border p-4 text-sm ${eligibility.state === 'eligible' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : eligibility.state === 'loading' || eligibility.state === 'error' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-semibold">{eligibility.state === 'eligible' ? 'Eligible to check in' : eligibility.state === 'loading' ? 'Checking membership…' : eligibility.state === 'already' ? 'Already checked in' : eligibility.state === 'expired' ? 'Membership expired' : eligibility.state === 'cancelled' ? 'Membership cancelled' : eligibility.state === 'none' ? 'No active membership' : 'Eligibility pre-check unavailable'}</p>
              {'message' in eligibility && <p className="mt-1">{eligibility.message}</p>}
            </div>
          )}

          <label htmlFor="check-in-notes" className="block text-sm font-semibold text-gray-700">Notes <span className="font-normal text-gray-400">(optional)</span><textarea id="check-in-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} disabled={submitting} className={`${inputClass} min-h-24 resize-y`} /></label>
          {submitError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{submitError}</div>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!canSubmit} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Checking in…' : 'Confirm Check-In'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
