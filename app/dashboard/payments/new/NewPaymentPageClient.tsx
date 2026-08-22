'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { formatPaymentDate, inrFormatter, paymentMemberName } from '../payment-format';
import type {
  MembershipPaymentSummary,
  PaymentDetailResponse,
  PaymentMemberSearchRecord,
  PaymentMemberSearchResponse,
  PaymentMethod,
  PaymentMembership,
} from '../types';

interface MemberMembershipsResponse {
  memberships: PaymentMembership[];
}

interface ApiError {
  error?: string;
  details?: string[];
  remainingBalance?: number;
}

function amountError(value: string, remainingBalance: number): string {
  if (!value.trim()) return 'Amount is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return 'Enter a positive amount with no more than two decimal places.';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
  if (Math.round(amount * 100) > Math.round(remainingBalance * 100)) {
    return `Amount cannot exceed the remaining balance of ${inrFormatter.format(remainingBalance)}.`;
  }
  return '';
}

export default function NewPaymentPageClient({
  initialMember,
  initialMembership,
}: {
  initialMember: string;
  initialMembership: string;
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialMember);
  const [search, setSearch] = useState(initialMember);
  const [members, setMembers] = useState<PaymentMemberSearchRecord[]>([]);
  const [selectedMember, setSelectedMember] = useState<PaymentMemberSearchRecord | null>(null);
  const [memberLoading, setMemberLoading] = useState(Boolean(initialMember));
  const [memberError, setMemberError] = useState('');
  const [summaries, setSummaries] = useState<MembershipPaymentSummary[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState('');
  const [selectedMembershipId, setSelectedMembershipId] = useState(initialMembership);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedSummary = summaries.find((summary) => summary.membership._id === selectedMembershipId) || null;
  const availableSummaries = summaries.filter((summary) => summary.remainingBalance > 0);
  const fullyPaidCount = summaries.length - availableSummaries.length;
  const validationMessage = selectedSummary ? amountError(amount, selectedSummary.remainingBalance) : '';
  const exactFinalPayment = selectedSummary && amount && !validationMessage && Math.round(Number(amount) * 100) === Math.round(selectedSummary.remainingBalance * 100);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (selectedMember || !search) return;
    const controller = new AbortController();
    async function findMembers() {
      setMemberLoading(true);
      setMemberError('');
      try {
        const params = new URLSearchParams({ page: '1', limit: '8', status: 'active', search });
        const response = await fetch(`/api/members?${params}`, { signal: controller.signal });
        if (response.status === 401) return router.replace('/login');
        if (!response.ok) throw new Error();
        const data = (await response.json()) as PaymentMemberSearchResponse;
        setMembers(data.members);
        const exact = data.members.find((member) => member.memberId.toUpperCase() === initialMember.toUpperCase());
        if (exact && initialMember) {
          setSelectedMember(exact);
          setMembers([]);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setMemberError('Members could not be searched. Please try again.');
      } finally {
        if (!controller.signal.aborted) setMemberLoading(false);
      }
    }
    void findMembers();
    return () => controller.abort();
  }, [initialMember, router, search, selectedMember]);

  useEffect(() => {
    if (!selectedMember) return;
    const member = selectedMember;
    const controller = new AbortController();
    async function loadMemberships() {
      setMembershipLoading(true);
      setMembershipError('');
      try {
        const response = await fetch(`/api/members/${encodeURIComponent(member.memberId)}/memberships?page=1&limit=100`, { signal: controller.signal });
        if (response.status === 401) return router.replace('/login');
        if (!response.ok) throw new Error();
        const data = (await response.json()) as MemberMembershipsResponse;
        const results = await Promise.all(data.memberships.map(async (membership) => {
          const summaryResponse = await fetch(`/api/memberships/${encodeURIComponent(membership._id)}/payments?page=1&limit=1`, { signal: controller.signal });
          if (summaryResponse.status === 401) {
            router.replace('/login');
            throw new Error('Not authenticated');
          }
          if (!summaryResponse.ok) throw new Error();
          return (await summaryResponse.json()) as MembershipPaymentSummary;
        }));
        setSummaries(results);
        const requested = results.find((summary) => summary.membership._id === initialMembership && summary.remainingBalance > 0);
        setSelectedMembershipId(requested?.membership._id || results.find((summary) => summary.remainingBalance > 0)?.membership._id || '');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setMembershipError('Membership balances could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted) setMembershipLoading(false);
      }
    }
    void loadMemberships();
    return () => controller.abort();
  }, [initialMembership, router, selectedMember]);

  const canSubmit = Boolean(selectedMember && selectedSummary && amount && !validationMessage && !submitting);

  function chooseMember(member: PaymentMemberSearchRecord) {
    setSelectedMember(member);
    setSearchInput(`${member.firstName} ${member.lastName}`);
    setMembers([]);
    setSelectedMembershipId('');
    setAmount('');
    setSubmitError('');
    setMemberLoading(false);
  }

  function changeMember() {
    setSelectedMember(null);
    setSearchInput('');
    setSearch('');
    setSummaries([]);
    setSelectedMembershipId('');
    setAmount('');
    setSubmitted(false);
    setMemberLoading(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError('');
    if (!selectedMember || !selectedSummary || validationMessage) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.memberId,
          membershipId: selectedSummary.membership._id,
          amount: Number(amount),
          paymentMethod,
          ...(transactionReference.trim() ? { transactionReference: transactionReference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      if (response.status === 401) return router.replace('/login');
      const data = (await response.json()) as PaymentDetailResponse & ApiError;
      if (!response.ok) {
        if (response.status === 409) {
          setSubmitError(typeof data.remainingBalance === 'number' ? `The balance changed. Only ${inrFormatter.format(data.remainingBalance)} remains; review the amount and try again.` : (data.error || 'This payment conflicts with a newer balance.'));
        } else {
          setSubmitError(data.details?.join(' ') || data.error || 'The payment could not be recorded. Please try again.');
        }
        return;
      }
      router.push(`/dashboard/payments/${encodeURIComponent(data.payment._id)}?recorded=1`);
    } catch {
      setSubmitError('The payment could not be recorded. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <Link href="/dashboard/payments" className="text-sm font-semibold text-blue-700 hover:text-blue-900">← Back to Payments</Link>
        <p className="mt-5 text-sm font-semibold text-blue-700">Financial management · INR · IST</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Record Payment</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a member and membership, review the authoritative balance, then record the amount received.</p>
      </header>

      <form onSubmit={submit} noValidate className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">1. Select member</h2>
          {selectedMember ? (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-gray-900">{paymentMemberName(selectedMember)}</p><p className="mt-1 font-mono text-sm font-semibold text-blue-700">{selectedMember.memberId}</p><p className="mt-1 text-sm text-gray-600">{selectedMember.phone}</p></div>
              <button type="button" onClick={changeMember} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700">Change member</button>
            </div>
          ) : (
            <div className="relative mt-4">
              <label htmlFor="member-search" className="text-sm font-semibold text-gray-700">Search active members</label>
              <input id="member-search" value={searchInput} onChange={(event) => { const value = event.target.value; setSearchInput(value); if (!value.trim()) { setMembers([]); setMemberLoading(false); } }} autoComplete="off" placeholder="Name, public member ID, phone, or email" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              {memberLoading && <p role="status" className="mt-2 text-sm text-gray-500">Searching members…</p>}
              {memberError && <p role="alert" className="mt-2 text-sm text-red-700">{memberError}</p>}
              {!memberLoading && search && !members.length && !memberError && <p className="mt-2 text-sm text-gray-500">No active members found.</p>}
              {members.length > 0 && <ul aria-label="Member search results" className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">{members.map((member) => <li key={member.memberId}><button type="button" onClick={() => chooseMember(member)} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-blue-50"><span><span className="block font-semibold text-gray-900">{paymentMemberName(member)}</span><span className="mt-1 block text-sm text-gray-500">{member.phone}</span></span><span className="font-mono text-xs font-semibold text-blue-700">{member.memberId}</span></button></li>)}</ul>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">2. Choose membership</h2>
          {!selectedMember ? <p className="mt-3 text-sm text-gray-500">Select a member to load membership balances.</p> : membershipLoading ? <div role="status" className="mt-4 h-32 animate-pulse rounded-lg bg-gray-100" /> : membershipError ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{membershipError}</p> : availableSummaries.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center"><p className="font-semibold text-gray-900">No outstanding membership balance</p><p className="mt-1 text-sm text-gray-500">This member has no membership that can accept another payment.</p></div> : (
            <div className="mt-4 space-y-3">
              {availableSummaries.map((summary) => {
                const membership = summary.membership;
                const checked = membership._id === selectedMembershipId;
                return <label key={membership._id} className={`block cursor-pointer rounded-lg border p-4 ${checked ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}`}><span className="flex items-start gap-3"><input type="radio" name="membership" checked={checked} onChange={() => { setSelectedMembershipId(membership._id); setAmount(''); setSubmitted(false); setSubmitError(''); }} className="mt-1 size-4 accent-blue-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-gray-900">{membership.plan.name}</strong><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{inrFormatter.format(summary.remainingBalance)} due</span></span><span className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2"><span>{formatPaymentDate(membership.startDate, false)} – {formatPaymentDate(membership.endDate, false)}</span><span>Price {inrFormatter.format(membership.priceAtPurchase)} · Paid {inrFormatter.format(summary.totalPaid)}</span></span></span></span></label>;
              })}
              {fullyPaidCount > 0 && <p className="text-xs text-gray-500">{fullyPaidCount} fully paid membership {fullyPaidCount === 1 ? 'record is' : 'records are'} hidden from selection.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">3. Payment details</h2>
          {selectedSummary ? <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700"><span className="font-semibold">Current remaining balance:</span> {inrFormatter.format(selectedSummary.remainingBalance)}</div> : <p className="mt-3 text-sm text-gray-500">Choose a membership before entering payment details.</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label htmlFor="payment-amount" className="text-sm font-semibold text-gray-700">Amount (INR)<input id="payment-amount" inputMode="decimal" value={amount} disabled={!selectedSummary} onChange={(event) => { setAmount(event.target.value); setSubmitted(false); }} aria-invalid={Boolean(amount && validationMessage)} aria-describedby="payment-amount-help payment-amount-error" placeholder="0.00" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label htmlFor="payment-method" className="text-sm font-semibold text-gray-700">Payment method<select id="payment-method" value={paymentMethod} disabled={!selectedSummary} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-normal outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank-transfer">Bank Transfer</option><option value="other">Other</option></select></label>
          </div>
          <p id="payment-amount-help" className="mt-2 text-xs text-gray-500">Use at most two decimal places. Server-side balance protection is applied again when saved.</p>
          {(submitted || amount) && validationMessage && <p id="payment-amount-error" role="alert" className="mt-2 text-sm font-medium text-red-700">{validationMessage}</p>}
          {exactFinalPayment && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">This exact final payment will mark the membership Paid in Full.</p>}
          <div className="mt-4 grid gap-4">
            <label htmlFor="transaction-reference" className="text-sm font-semibold text-gray-700">Transaction reference <span className="font-normal text-gray-500">(optional)</span><input id="transaction-reference" maxLength={150} value={transactionReference} disabled={!selectedSummary} onChange={(event) => setTransactionReference(event.target.value)} placeholder="Receipt, UPI, card, or bank reference" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label htmlFor="payment-notes" className="text-sm font-semibold text-gray-700">Notes <span className="font-normal text-gray-500">(optional)</span><textarea id="payment-notes" maxLength={1000} rows={3} value={notes} disabled={!selectedSummary} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 font-normal outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          {submitError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/dashboard/payments" className="rounded-lg border border-gray-300 px-5 py-2.5 text-center text-sm font-semibold text-gray-700">Cancel</Link><button type="submit" disabled={!canSubmit} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Recording…' : 'Record Payment'}</button></div>
        </section>
      </form>
    </div>
  );
}
