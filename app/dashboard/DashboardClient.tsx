'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TrendChart from './reports/TrendChart';

type Overview = {
  members: { totalMembers: number; activeMembers: number; inactiveMembers: number; newMembersInRange: number };
  memberships: { activeMemberships: number; expiringSoon: number; expiringSoonWindowDays: number };
  attendance: { attendanceCountInRange: number; currentlyCheckedIn: number };
  payments: { netRevenueInRange: number };
  trainers: { totalTrainers: number; activeTrainers: number; inactiveTrainers: number };
};
type TrendPoint = { bucket: string; newMembers: number; attendanceCount: number; netRevenue: number };
type Member = { memberId: string; firstName: string; lastName: string; joiningDate: string; status: 'active' | 'inactive' };
type Payment = { amount: number; paymentMethod: string; status: 'paid' | 'refunded'; paymentDate: string; member?: { firstName: string; lastName: string } };
type Attendance = { checkInAt: string; member?: { firstName: string; lastName: string; memberId: string } };
type ActiveMembership = { endDate: string; plan?: { name: string }; member?: { firstName: string; lastName: string; memberId: string } };
type DashboardData = { month: Overview; today: Overview; trends: TrendPoint[]; outstanding: number; members: Member[]; payments: Payment[]; attendance: Attendance[]; memberships: ActiveMembership[]; warningDays: number };

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

function todayKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function addDays(dateKey: string, days: number): string { const date = new Date(`${dateKey}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function formatDate(value: string): string { return dateFormatter.format(new Date(value)); }
function formatName(person?: { firstName: string; lastName: string }): string { return person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown member'; }

async function fetchJson<T>(url: string, router: ReturnType<typeof useRouter>): Promise<T> {
  const response = await fetch(url);
  if (response.status === 401) { router.replace('/login'); throw new Error('Your session has expired. Please sign in again.'); }
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Dashboard data could not be loaded.');
  return body;
}

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [currentTime] = useState(() => new Date().getTime());

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('');
    const today = todayKey(); const from = addDays(today, -6);
    try {
      const [month, todayOverview, trends, outstanding, members, payments, attendance, memberships, settings] = await Promise.all([
        fetchJson<Overview>('/api/reports/overview?range=this-month', router),
        fetchJson<Overview>('/api/reports/overview?range=today', router),
        fetchJson<{ points: TrendPoint[] }>(`/api/reports/trends?range=custom&from=${from}&to=${today}&interval=daily`, router),
        fetchJson<{ summary?: { totalOutstanding?: number } }>('/api/reports/outstanding-balances?limit=1', router),
        fetchJson<{ members: Member[] }>('/api/members?limit=5', router),
        fetchJson<{ payments: Payment[] }>('/api/payments?limit=5', router),
        fetchJson<{ attendance: Attendance[] }>(`/api/attendance?date=${today}&status=checked-in&limit=5`, router),
        fetchJson<{ memberships: ActiveMembership[] }>('/api/memberships?status=active&limit=100', router),
        fetchJson<{ settings?: { membershipExpiryWarningDays?: number } }>('/api/settings/gym', router),
      ]);
      setData({ month, today: todayOverview, trends: trends.points ?? [], outstanding: outstanding.summary?.totalOutstanding ?? 0, members: members.members ?? [], payments: payments.payments ?? [], attendance: attendance.attendance ?? [], memberships: memberships.memberships ?? [], warningDays: settings.settings?.membershipExpiryWarningDays ?? 7 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Dashboard data could not be loaded.'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, retryKey]);

  const expiring = useMemo(() => {
    if (!data) return [];
    const now = currentTime; const cutoff = now + data.warningDays * 24 * 60 * 60 * 1000;
    return data.memberships.filter((membership) => { const expiry = new Date(membership.endDate).getTime(); return expiry >= now && expiry <= cutoff; }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).slice(0, 5);
  }, [currentTime, data]);

  if (loading) return <DashboardLoading />;
  if (error || !data) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert"><h1 className="text-xl font-bold text-red-950">Dashboard unavailable</h1><p className="mt-2 text-sm text-red-800">{error || 'Dashboard data could not be loaded.'}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Retry</button></section>;

  const cards = [
    { title: 'Total Members', value: String(data.month.members.totalMembers), subtitle: `${data.month.members.newMembersInRange} joined this month`, icon: <MembersIcon />, tone: 'blue' },
    { title: 'Active Members', value: String(data.month.members.activeMembers), subtitle: `${data.month.members.inactiveMembers} inactive`, icon: <ActiveMembersIcon />, tone: 'emerald' },
    { title: 'Active Memberships', value: String(data.month.memberships.activeMemberships), subtitle: `${expiring.length} expiring within ${data.warningDays} days`, icon: <MembershipsIcon />, tone: 'violet' },
    { title: "Today's Attendance", value: String(data.today.attendance.currentlyCheckedIn), subtitle: 'Currently checked in', icon: <AttendanceIcon />, tone: 'amber' },
    { title: 'Trainers', value: String(data.month.trainers.totalTrainers), subtitle: `${data.month.trainers.activeTrainers} active`, icon: <TrainerIcon />, tone: 'cyan' },
    { title: "Today's Revenue", value: currencyFormatter.format(data.today.payments.netRevenueInRange), subtitle: 'Net paid today', icon: <PaymentsIcon />, tone: 'rose' },
    { title: 'Monthly Revenue', value: currencyFormatter.format(data.month.payments.netRevenueInRange), subtitle: 'Net paid this month', icon: <RevenueIcon />, tone: 'indigo' },
    { title: 'Outstanding Balance', value: currencyFormatter.format(data.outstanding), subtitle: 'Across unpaid memberships', icon: <BalanceIcon />, tone: 'orange' },
  ];
  const trendPoints = (key: 'newMembers' | 'attendanceCount' | 'netRevenue') => data.trends.map((point) => ({ label: point.bucket.slice(5), value: point[key] }));

  return <div className="space-y-6" aria-live="polite">
    <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg lg:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Operations overview</p><h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">Good to see you at GymPro</h1><p className="mt-2 max-w-2xl text-sm text-blue-100 lg:text-base">A live view of members, revenue, attendance, and the actions that keep your gym moving.</p></section>
    <section aria-labelledby="summary-heading"><div className="mb-3"><h2 id="summary-heading" className="text-lg font-bold text-slate-950">Today at a glance</h2><p className="mt-1 text-sm text-slate-500">Live values from your gym records.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.title} {...card} />)}</div></section>
    <section aria-labelledby="quick-actions-heading"><div className="mb-3"><h2 id="quick-actions-heading" className="text-lg font-bold text-slate-950">Quick actions</h2><p className="mt-1 text-sm text-slate-500">Jump directly into common workflows.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><QuickAction href="/dashboard/members/new" label="Add Member" icon={<PlusIcon />} /><QuickAction href="/dashboard/payments/new" label="Record Payment" icon={<PaymentsIcon />} /><QuickAction href="/dashboard/attendance" label="Check In Member" icon={<AttendanceIcon />} /><QuickAction href="/dashboard/members" label="Assign Membership" icon={<MembershipsIcon />} /><QuickAction href="/dashboard/trainers/new" label="Add Trainer" icon={<TrainerIcon />} /><QuickAction href="/dashboard/reports" label="View Reports" icon={<ChartIcon />} /></div></section>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5"><DashboardPanel title="Recent members" action={{ href: '/dashboard/members', label: 'View all members' }} className="xl:col-span-3"><div className="divide-y divide-slate-100">{data.members.length ? data.members.map((member) => <div key={member.memberId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{member.firstName} {member.lastName}</p><p className="text-xs text-slate-500">{member.memberId} · Joined {formatDate(member.joiningDate)}</p></div><StatusPill status={member.status} /></div>) : <EmptyState message="No members yet." />}</div></DashboardPanel><DashboardPanel title="Memberships expiring soon" action={{ href: '/dashboard/memberships', label: 'View memberships' }} className="xl:col-span-2">{expiring.length ? <div className="space-y-3">{expiring.map((membership, index) => <div key={`${membership.endDate}-${index}`} className="rounded-xl bg-amber-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{formatName(membership.member)}</p><p className="truncate text-xs text-slate-600">{membership.plan?.name ?? 'Membership plan'}</p></div><span className="shrink-0 text-xs font-bold text-amber-800">{daysRemaining(membership.endDate, currentTime)}d left</span></div><p className="mt-2 text-xs text-amber-900">Expires {formatDate(membership.endDate)}</p></div>)}</div> : <EmptyState message="No memberships expiring." />}</DashboardPanel></div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5"><DashboardPanel title="Recent payments" action={{ href: '/dashboard/payments', label: 'View all payments' }} className="xl:col-span-3">{data.payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 pr-3 font-semibold">Member</th><th className="pb-3 pr-3 font-semibold">Amount</th><th className="pb-3 pr-3 font-semibold">Method</th><th className="pb-3 pr-3 font-semibold">Status</th><th className="pb-3 font-semibold">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{data.payments.map((payment, index) => <tr key={`${payment.paymentDate}-${index}`}><td className="py-3 pr-3 font-semibold text-slate-900">{formatName(payment.member)}</td><td className="py-3 pr-3 text-slate-700">{currencyFormatter.format(payment.amount)}</td><td className="py-3 pr-3 capitalize text-slate-600">{payment.paymentMethod.replace('-', ' ')}</td><td className="py-3 pr-3"><StatusPill status={payment.status} /></td><td className="py-3 text-slate-500">{formatDate(payment.paymentDate)}</td></tr>)}</tbody></table></div> : <EmptyState message="No recent payments." />}</DashboardPanel><DashboardPanel title="Currently checked in" action={{ href: '/dashboard/attendance', label: 'View attendance' }} className="xl:col-span-2">{data.attendance.length ? <div className="space-y-3">{data.attendance.map((record, index) => <div key={`${record.checkInAt}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{formatName(record.member)}</p><p className="text-xs text-slate-500">{record.member?.memberId ?? 'Member'}</p></div><time dateTime={record.checkInAt} className="shrink-0 text-xs font-bold text-emerald-800">{timeFormatter.format(new Date(record.checkInAt))}</time></div>)}</div> : <EmptyState message="No members are checked in." />}</DashboardPanel></div>
    <section aria-labelledby="charts-heading"><div className="mb-3"><h2 id="charts-heading" className="text-lg font-bold text-slate-950">Last 7 days</h2><p className="mt-1 text-sm text-slate-500">Daily activity from existing report data.</p></div><div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><TrendChart title="New members" description="Members joining each day" points={trendPoints('newMembers')} color="#2563eb" kind="bar" /><TrendChart title="Attendance" description="Attendance records each day" points={trendPoints('attendanceCount')} color="#059669" kind="line" /><TrendChart title="Revenue" description="Net paid revenue each day" points={trendPoints('netRevenue')} color="#d97706" kind="bar" valueFormatter={(value) => currencyFormatter.format(value)} /></div></section>
    <section aria-labelledby="trainer-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="trainer-heading" className="text-lg font-bold text-slate-950">Trainer summary</h2><p className="mt-1 text-sm text-slate-500">Current trainer roster.</p></div><Link href="/dashboard/trainers" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Manage trainers <span aria-hidden="true">→</span></Link></div><div className="mt-5 grid grid-cols-3 gap-3"><SummaryMetric label="Total" value={data.month.trainers.totalTrainers} /><SummaryMetric label="Active" value={data.month.trainers.activeTrainers} tone="green" /><SummaryMetric label="Inactive" value={data.month.trainers.inactiveTrainers} tone="gray" /></div></section>
  </div>;
}

function DashboardLoading() { return <div className="space-y-6" role="status" aria-label="Loading dashboard"><div className="h-44 animate-pulse rounded-2xl bg-slate-200" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div><span className="sr-only">Loading live dashboard data…</span></div>; }
function DashboardPanel({ title, action, className = '', children }: { title: string; action: { href: string; label: string }; className?: string; children: React.ReactNode }) { const id = title.toLowerCase().replace(/\s+/g, '-'); return <section aria-labelledby={`${id}-heading`} className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><h2 id={`${id}-heading`} className="text-lg font-bold text-slate-950">{title}</h2><Link href={action.href} className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900">{action.label} <span aria-hidden="true">→</span></Link></div>{children}</section>; }
function StatCard({ title, value, subtitle, icon, tone }: { title: string; value: string; subtitle: string; icon: React.ReactNode; tone: string }) { const tones: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', cyan: 'bg-cyan-50 text-cyan-700', rose: 'bg-rose-50 text-rose-700', indigo: 'bg-indigo-50 text-indigo-700', orange: 'bg-orange-50 text-orange-700' }; return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className={`rounded-xl p-3 ${tones[tone] ?? tones.blue}`}>{icon}</div><span className="text-xs font-medium text-slate-400">Live</span></div><h3 className="mt-5 text-sm font-semibold text-slate-600">{title}</h3><p className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{subtitle}</p></article>; }
function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) { return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">{icon}</span><span className="mt-3 block text-sm font-semibold leading-tight text-slate-800">{label}</span></Link>; }
function SummaryMetric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: string }) { const colors = tone === 'green' ? 'text-emerald-700 bg-emerald-50' : tone === 'gray' ? 'text-slate-600 bg-slate-100' : 'text-blue-700 bg-blue-50'; return <div className={`rounded-xl p-4 ${colors}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function StatusPill({ status }: { status: string }) { const positive = status === 'active' || status === 'paid'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{status.replace('-', ' ')}</span>; }
function EmptyState({ message }: { message: string }) { return <p className="py-8 text-center text-sm text-slate-500">{message}</p>; }
function daysRemaining(value: string, now: number): number { return Math.max(0, Math.ceil((new Date(value).getTime() - now) / 86400000)); }
function Icon({ children }: { children: React.ReactNode }) { return <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5" strokeWidth={1.8}>{children}</svg>; }
function MembersIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 00-12 0m6-8a4 4 0 100-8 4 4 0 000 8zm6-3a3 3 0 110-6m3 17a5 5 0 00-4-4.9" /></Icon>; }
function ActiveMembersIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" /></Icon>; }
function MembershipsIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v16H7zM9 8h6m-6 4h6m-6 4h3" /></Icon>; }
function AttendanceIcon() { return <Icon><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M12 8v4l2.5 2.5" /></Icon>; }
function TrainerIcon() { return <Icon><circle cx="12" cy="7" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M17 11l2 2-2 2" /></Icon>; }
function PaymentsIcon() { return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h.01" /></Icon>; }
function RevenueIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M7 15l3-4 3 2 4-6" /></Icon>; }
function BalanceIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 7h14M6 7l-3 6h6L6 7zm12 0l-3 6h6l-3-6zM4 20h16" /></Icon>; }
function PlusIcon() { return <Icon><path strokeLinecap="round" d="M12 5v14M5 12h14" /></Icon>; }
function ChartIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16v-3m4 3V8m4 8v-6" /></Icon>; }
