'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TrendChart from './reports/TrendChart';

type Overview = { members: { totalMembers: number; activeMembers: number; inactiveMembers: number; newMembersInRange: number }; memberships: { activeMemberships: number; expiredMemberships: number; cancelledMemberships: number; expiringSoon: number }; attendance: { attendanceCountInRange: number; uniqueMembersAttended: number; currentlyCheckedIn: number }; payments: { grossPaidInRange: number; refundedAmountInRange: number; netRevenueInRange: number }; trainers: { totalTrainers: number; activeTrainers: number; inactiveTrainers: number } };
type TrendPoint = { bucket: string; newMembers: number; attendanceCount: number; netRevenue: number };
type Member = { memberId: string; firstName: string; lastName: string; joiningDate: string; status: 'active' | 'inactive'; createdAt?: string };
type Payment = { _id?: string; amount: number; paymentMethod: string; status: 'paid' | 'refunded'; paymentDate: string; createdAt?: string; member?: { firstName: string; lastName: string; memberId?: string } };
type Attendance = { _id?: string; checkInAt: string; checkOutAt?: string; status: 'checked-in' | 'checked-out'; member?: { firstName: string; lastName: string; memberId: string } };
type Membership = { _id?: string; startDate: string; endDate: string; status: 'active' | 'expired' | 'cancelled'; createdAt?: string; plan?: { name: string }; member?: { firstName: string; lastName: string; memberId: string } };
type Trainer = { _id?: string; trainerId: string; firstName: string; lastName: string; specialization: string; experienceYears: number; status: 'active' | 'inactive'; createdAt?: string };
type ReportPayment = { summary: { grossPaid: number; refundedAmount: number; netRevenue: number; paymentCount: number; paidCount: number; refundedCount: number; }; rows: Array<{ paymentDate: string; memberName: string; amount: number; method: string; status: 'paid' | 'refunded' }> };
type ReportMembership = { rows: Array<{ memberId: string; memberName: string; plan: string; startDate: string; endDate: string; status: 'active' | 'expired' | 'cancelled' }>; summary: { active: number; expired: number; cancelled: number; expiringSoon: number } };
type ReportAttendance = { rows: Array<{ gymDate: string; memberId: string; memberName: string; checkIn: string; checkOut?: string; status: 'checked-in' | 'checked-out' }>; summary: { totalAttendanceRecords: number; uniqueMembers: number; checkedIn: number; checkedOut: number } };
type ReportTrainer = { rows: Trainer[]; summary: { total: number; active: number; inactive: number } };
type DashboardData = { month: Overview; previousMonth: Overview; today: Overview; week: Overview; trends30: TrendPoint[]; trends12: TrendPoint[]; outstanding: { totalOutstanding: number; rows: Array<{ memberName: string; memberId: string; remainingBalance: number; endDate: string }> }; members: Member[]; payments: Payment[]; attendanceToday: Attendance[]; attendanceWeek: Attendance[]; memberships: Membership[]; membershipsReport: ReportMembership; trainers: Trainer[]; trainerReport: ReportTrainer; attendanceReport: ReportAttendance; paymentsReport: ReportPayment; warningDays: number };
type Activity = { id: string; label: string; detail: string; date: string; tone: 'blue' | 'green' | 'amber' | 'violet' };

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

function gymDate(now = new Date()): string { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function addDays(key: string, days: number): string { const date = new Date(`${key}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function monthStart(key: string): string { return `${key.slice(0, 8)}01`; }
function monthOffset(key: string, offset: number): string { const date = new Date(`${monthStart(key)}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); return date.toISOString().slice(0, 10); }
function dateLabel(value?: string): string { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date); }
function memberName(value?: { firstName: string; lastName: string }): string { return value ? `${value.firstName} ${value.lastName}`.trim() : 'Unknown member'; }
function percentChange(current: number, previous: number): number | null { return previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / Math.abs(previous)) * 100; }
function dayCount(from: string, to: string): number { return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000) + 1; }

async function fetchJson<T>(url: string, router: ReturnType<typeof useRouter>): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (response.status === 401) { router.replace('/login'); throw new Error('Your session has expired. Please sign in again.'); }
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Dashboard data could not be loaded.');
  return body;
}

export default function AdvancedDashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentTime] = useState(() => new Date().getTime());
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError('');
    const today = gymDate(); const weekFrom = addDays(today, -6); const monthFrom = monthStart(today); const previousFrom = monthOffset(today, -1); const previousTo = addDays(monthFrom, -1); const yearFrom = monthOffset(today, -11);
    try {
      const [month, previousMonth, todayOverview, week, trends30, trends12, outstanding, members, payments, attendanceToday, attendanceWeek, memberships, membershipsReport, trainers, trainerReport, attendanceReport, paymentsReport, settings] = await Promise.all([
        fetchJson<Overview>('/api/reports/overview?range=this-month', router),
        fetchJson<Overview>(`/api/reports/overview?range=custom&from=${previousFrom}&to=${previousTo}`, router),
        fetchJson<Overview>('/api/reports/overview?range=today', router),
        fetchJson<Overview>('/api/reports/overview?range=this-week', router),
        fetchJson<{ points: TrendPoint[] }>(`/api/reports/trends?range=custom&from=${addDays(today, -29)}&to=${today}&interval=daily`, router),
        fetchJson<{ points: TrendPoint[] }>(`/api/reports/trends?range=custom&from=${yearFrom}&to=${today}&interval=monthly`, router),
        fetchJson<{ summary: { totalOutstanding: number }; rows: Array<{ memberName: string; memberId: string; remainingBalance: number; endDate: string }> }>('/api/reports/outstanding-balances?limit=100', router),
        fetchJson<{ members: Member[] }>('/api/members?limit=100', router),
        fetchJson<{ payments: Payment[] }>('/api/payments?limit=100', router),
        fetchJson<{ attendance: Attendance[] }>(`/api/attendance?date=${today}&limit=100`, router),
        fetchJson<{ attendance: Attendance[] }>(`/api/attendance?from=${weekFrom}&to=${today}&limit=100`, router),
        fetchJson<{ memberships: Membership[] }>('/api/memberships?limit=100', router),
        fetchJson<ReportMembership>(`/api/reports/memberships?range=custom&from=${yearFrom}&to=${today}&limit=100`, router),
        fetchJson<{ trainers: Trainer[] }>('/api/trainers?limit=100', router),
        fetchJson<ReportTrainer>('/api/reports/trainers?limit=100', router),
        fetchJson<ReportAttendance>('/api/reports/attendance?range=this-month&limit=100', router),
        fetchJson<ReportPayment>('/api/reports/payments?range=this-month&limit=100', router),
        fetchJson<{ settings?: { membershipExpiryWarningDays?: number } }>('/api/settings/gym', router),
      ]);
      setData({ month, previousMonth, today: todayOverview, week, trends30: trends30.points ?? [], trends12: trends12.points ?? [], outstanding: { totalOutstanding: outstanding.summary.totalOutstanding, rows: outstanding.rows ?? [] }, members: members.members ?? [], payments: payments.payments ?? [], attendanceToday: attendanceToday.attendance ?? [], attendanceWeek: attendanceWeek.attendance ?? [], memberships: memberships.memberships ?? [], membershipsReport, trainers: trainers.trainers ?? [], trainerReport, attendanceReport, paymentsReport, warningDays: settings.settings?.membershipExpiryWarningDays ?? 7 });
      setLastUpdated(new Date());
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Dashboard data could not be loaded.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load, retryKey]);

  const derived = useMemo(() => {
    if (!data) return null;
    const activeMembers = data.month.members.activeMembers;
    const todayAttendance = data.today.attendance.attendanceCountInRange;
    const attendancePercent = activeMembers ? (todayAttendance / activeMembers) * 100 : null;
    const planCounts = new Map<string, number>();
    data.membershipsReport.rows.forEach((row) => planCounts.set(row.plan, (planCounts.get(row.plan) ?? 0) + 1));
    const popularPlan = [...planCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const specializations = new Map<string, number>();
    data.trainers.forEach((trainer) => specializations.set(trainer.specialization || 'Other', (specializations.get(trainer.specialization || 'Other') ?? 0) + 1));
    const peakDay = [...new Map(data.attendanceReport.rows.map((row) => [row.gymDate, 0])).keys()].map((day) => ({ day, count: data.attendanceReport.rows.filter((row) => row.gymDate === day).length })).sort((a, b) => b.count - a.count)[0];
    const hourCounts = new Map<number, number>();
    data.attendanceReport.rows.forEach((row) => { const hour = new Date(row.checkIn).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }); const value = Number(hour); hourCounts.set(value, (hourCounts.get(value) ?? 0) + 1); });
    const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const absent = data.members.filter((member) => member.status === 'active' && !data.attendanceWeek.some((record) => record.member?.memberId === member.memberId)).slice(0, 5);
    const expiring = data.memberships.filter((membership) => { const end = new Date(membership.endDate).getTime(); const now = currentTime; return membership.status === 'active' && end >= now && end <= now + data.warningDays * 86400000; }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).slice(0, 5);
    const membershipCounts = new Map<string, number>();
    data.membershipsReport.rows.forEach((row) => membershipCounts.set(row.memberId, (membershipCounts.get(row.memberId) ?? 0) + 1));
    const currentMonthStart = monthStart(gymDate());
    const previousMonthStart = monthOffset(gymDate(), -1);
    const renewalsThisMonth = data.membershipsReport.rows.filter((row) => row.startDate >= currentMonthStart && (membershipCounts.get(row.memberId) ?? 0) > 1).length;
    const currentMemberships = data.membershipsReport.rows.filter((row) => row.startDate >= currentMonthStart).length;
    const previousMemberships = data.membershipsReport.rows.filter((row) => row.startDate >= previousMonthStart && row.startDate < currentMonthStart).length;
    const activities: Activity[] = [
      ...data.members.slice(0, 20).map((item) => ({ id: `member-${item.memberId}`, label: 'New member joined', detail: `${item.firstName} ${item.lastName}`, date: item.createdAt ?? item.joiningDate, tone: 'blue' as const })),
      ...data.memberships.slice(0, 100).map((item) => ({ id: `membership-${item._id ?? item.startDate}`, label: item.status === 'cancelled' ? 'Membership cancelled' : 'Membership assigned', detail: `${memberName(item.member)} · ${item.plan?.name ?? 'Plan'}`, date: item.createdAt ?? item.startDate, tone: item.status === 'cancelled' ? 'amber' as const : 'violet' as const })),
      ...data.payments.slice(0, 20).map((item) => ({ id: `payment-${item._id ?? item.paymentDate}`, label: 'Payment recorded', detail: `${memberName(item.member)} · ${money.format(item.amount)}`, date: item.createdAt ?? item.paymentDate, tone: 'green' as const })),
      ...data.attendanceWeek.slice(0, 40).map((item) => ({ id: `attendance-${item._id ?? item.checkInAt}`, label: item.status === 'checked-out' ? 'Attendance check-out' : 'Attendance check-in', detail: memberName(item.member), date: item.status === 'checked-out' ? item.checkOutAt ?? item.checkInAt : item.checkInAt, tone: 'green' as const })),
      ...data.trainers.slice(0, 20).map((item) => ({ id: `trainer-${item._id ?? item.trainerId}`, label: 'Trainer added', detail: `${item.firstName} ${item.lastName}`, date: item.createdAt ?? '', tone: 'blue' as const })),
    ].filter((activity) => activity.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
    return { attendancePercent, popularPlan, specializations: [...specializations.entries()], peakDay, peakHour, absent, expiring, renewalsThisMonth, activities, growth: percentChange(data.month.payments.netRevenueInRange, data.previousMonth.payments.netRevenueInRange), memberGrowth: percentChange(data.month.members.newMembersInRange, data.previousMonth.members.newMembersInRange), membershipGrowth: percentChange(currentMemberships, previousMemberships), averagePayment: data.paymentsReport.summary.paidCount ? data.paymentsReport.summary.grossPaid / data.paymentsReport.summary.paidCount : 0, paymentMethods: [...data.paymentsReport.rows.reduce((map, payment) => map.set(payment.method, (map.get(payment.method) ?? 0) + 1), new Map<string, number>()).entries()] };
  }, [currentTime, data]);

  if (loading) return <DashboardLoading />;
  if (error || !data || !derived) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert"><h1 className="text-xl font-bold text-red-950">Dashboard unavailable</h1><p className="mt-2 text-sm text-red-800">{error || 'Dashboard data could not be loaded.'}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></section>;
  const previousRevenue = data.previousMonth.payments.netRevenueInRange; const currentRevenue = data.month.payments.netRevenueInRange;
  const health = [
    { label: 'Monthly revenue', value: money.format(currentRevenue), detail: `${data.month.payments.netRevenueInRange ? 'Net paid this month' : 'No paid records'}`, change: derived.growth, href: '/dashboard/payments' },
    { label: 'Previous month revenue', value: money.format(previousRevenue), detail: 'Net paid in previous month', href: '/dashboard/reports' },
    { label: 'New members this month', value: String(data.month.members.newMembersInRange), detail: 'New member records', change: derived.memberGrowth, href: '/dashboard/members' },
    { label: 'Membership renewals', value: String(derived.renewalsThisMonth), detail: 'Returning members renewed this month', href: '/dashboard/memberships' },
    { label: 'Outstanding payments', value: money.format(data.outstanding.totalOutstanding), detail: 'Unpaid membership balance', href: '/dashboard/reports' },
    { label: 'Active trainers', value: String(data.month.trainers.activeTrainers), detail: `${data.month.trainers.inactiveTrainers} inactive`, href: '/dashboard/trainers' },
    { label: "Today's attendance", value: derived.attendancePercent === null ? '—' : `${derived.attendancePercent.toFixed(0)}%`, detail: `${data.today.attendance.attendanceCountInRange} records · active-member basis`, href: '/dashboard/attendance' },
  ];
  const chart = (key: 'newMembers' | 'attendanceCount' | 'netRevenue', points: TrendPoint[]) => points.map((point) => ({ label: point.bucket.slice(5), value: point[key] }));
  const monthlyChart = data.trends12.map((point) => ({ label: point.bucket, value: point.netRevenue }));
  const paymentMethods = derived.paymentMethods.map(([label, value]) => ({ label, value }));
  const paidRefunded = [{ label: 'Paid', value: data.paymentsReport.summary.paidCount }, { label: 'Refunded', value: data.paymentsReport.summary.refundedCount }];
  const absentAlert = derived.absent.length > 0; const lowAttendance = derived.attendancePercent !== null && derived.attendancePercent < 30;

  return <div className="space-y-6" aria-live="polite">
    <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Business intelligence</p><h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">Gym operations control center</h1><p className="mt-2 max-w-2xl text-sm text-blue-100">See financial health, member activity, attendance, and action items in one live view.</p></div><button type="button" disabled={refreshing} onClick={() => void load(true)} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25 disabled:cursor-wait disabled:opacity-60" aria-label="Refresh all dashboard data"><RefreshIcon />{refreshing ? 'Refreshing…' : 'Refresh dashboard'}</button></div>{lastUpdated && <p className="mt-5 text-xs text-blue-200">Last updated {timeFormat.format(lastUpdated)} IST</p>}</section>
    <section aria-labelledby="health-heading"><div className="mb-3"><h2 id="health-heading" className="text-lg font-bold text-slate-950">Business health</h2><p className="mt-1 text-sm text-slate-500">Key indicators compared with the available previous period.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{health.map((item) => <KpiCard key={item.label} {...item} />)}</div></section>
    <Section title="Revenue analytics" id="revenue"><div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><TrendChart title="Revenue · last 30 days" description="Net paid revenue by day" points={chart('netRevenue', data.trends30)} color="#2563eb" kind="bar" valueFormatter={(value) => money.format(value)} /><TrendChart title="Revenue · last 12 months" description="Net paid revenue by month" points={monthlyChart} color="#7c3aed" kind="line" valueFormatter={(value) => money.format(value)} /><TrendChart title="Payment methods" description="Recorded payment count by method" points={paymentMethods} color="#059669" kind="bar" /><TrendChart title="Paid vs refunded" description="Current-month payment records" points={paidRefunded} color="#d97706" kind="bar" /><TrendChart title="Outstanding balance" description="Unpaid membership balance" points={[{ label: 'Outstanding', value: data.outstanding.totalOutstanding }]} color="#dc2626" kind="bar" valueFormatter={(value) => money.format(value)} /></div></Section>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><Section title="Membership analytics" id="membership"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniMetric label="Active" value={data.month.memberships.activeMemberships} /><MiniMetric label="Expiring 7d" value={data.month.memberships.expiringSoon} tone="amber" /><MiniMetric label="Expired" value={data.month.memberships.expiredMemberships} /><MiniMetric label="Cancelled" value={data.month.memberships.cancelledMemberships} /></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><InfoRow label="Most popular plan" value={derived.popularPlan ? `${derived.popularPlan[0]} (${derived.popularPlan[1]})` : '—'} /><InfoRow label="Membership growth" value={derived.membershipGrowth === null ? '—' : `${derived.membershipGrowth >= 0 ? '+' : ''}${derived.membershipGrowth.toFixed(1)}%`} /></div></Section><Section title="Attendance analytics" id="attendance"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniMetric label="Today" value={data.today.attendance.attendanceCountInRange} /><MiniMetric label="This week" value={data.week.attendance.attendanceCountInRange} /><MiniMetric label="This month" value={data.month.attendance.attendanceCountInRange} /><MiniMetric label="Avg / day" value={Math.round(data.month.attendance.attendanceCountInRange / Math.max(1, dayCount(monthStart(gymDate()), gymDate())))} /></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><InfoRow label="Peak attendance day" value={derived.peakDay ? `${dateLabel(derived.peakDay.day)} (${derived.peakDay.count})` : '—'} /><InfoRow label="Peak attendance hour" value={derived.peakHour ? `${derived.peakHour[0]}:00 (${derived.peakHour[1]})` : '—'} /></div></Section></div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><Section title="Trainer analytics" id="trainers"><div className="grid grid-cols-3 gap-3"><MiniMetric label="Total" value={data.trainerReport.summary.total} /><MiniMetric label="Active" value={data.trainerReport.summary.active} tone="green" /><MiniMetric label="Inactive" value={data.trainerReport.summary.inactive} /></div><div className="mt-5 space-y-3"><InfoRow label="Most experienced" value={data.trainers.length ? `${data.trainers.slice().sort((a, b) => b.experienceYears - a.experienceYears)[0].firstName} ${data.trainers.slice().sort((a, b) => b.experienceYears - a.experienceYears)[0].lastName}` : '—'} /><InfoRow label="Average experience" value={data.trainers.length ? `${(data.trainers.reduce((sum, trainer) => sum + trainer.experienceYears, 0) / data.trainers.length).toFixed(1)} years` : '—'} /><InfoRow label="Specializations" value={derived.specializations.map(([name, count]) => `${name} (${count})`).join(' · ') || '—'} /></div></Section><Section title="Payment summary" id="payments"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><MiniMetric label="Today" value={money.format(data.today.payments.netRevenueInRange)} compact /><MiniMetric label="This week" value={money.format(data.week.payments.netRevenueInRange)} compact /><MiniMetric label="This month" value={money.format(data.month.payments.netRevenueInRange)} compact /><MiniMetric label="Outstanding" value={money.format(data.outstanding.totalOutstanding)} compact tone="amber" /><MiniMetric label="Refunded" value={money.format(data.month.payments.refundedAmountInRange)} compact tone="red" /><MiniMetric label="Average" value={money.format(derived.averagePayment)} compact /></div></Section></div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><Section title="Activity timeline" id="timeline" className="xl:col-span-2"><div className="space-y-4">{derived.activities.length ? derived.activities.map((activity) => <div key={activity.id} className="flex gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activity.tone === 'green' ? 'bg-emerald-500' : activity.tone === 'amber' ? 'bg-amber-500' : activity.tone === 'violet' ? 'bg-violet-500' : 'bg-blue-500'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-slate-900">{activity.label}</p><time className="text-xs text-slate-500" dateTime={activity.date}>{dateLabel(activity.date)}</time></div><p className="text-sm text-slate-600">{activity.detail}</p></div></div>) : <EmptyState message="No recent activity." />}</div></Section><Section title="Dashboard alerts" id="alerts"><div className="space-y-3"><AlertRow visible={derived.expiring.length > 0} tone="amber" label={`${derived.expiring.length} membership${derived.expiring.length === 1 ? '' : 's'} expiring soon`} href="/dashboard/memberships" /><AlertRow visible={data.outstanding.rows.length > 0} tone="red" label={`${data.outstanding.rows.length} member balances need attention`} href="/dashboard/reports" /><AlertRow visible={data.month.trainers.inactiveTrainers > 0} tone="slate" label={`${data.month.trainers.inactiveTrainers} inactive trainer${data.month.trainers.inactiveTrainers === 1 ? '' : 's'}`} href="/dashboard/trainers" /><AlertRow visible={absentAlert} tone="blue" label={`${derived.absent.length} active members absent 7+ days`} href="/dashboard/members" /><AlertRow visible={lowAttendance} tone="amber" label="Attendance is low today" href="/dashboard/attendance" />{!derived.expiring.length && !data.outstanding.rows.length && !data.month.trainers.inactiveTrainers && !absentAlert && !lowAttendance && <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No urgent alerts.</p>}</div></Section></div>
    <section aria-labelledby="actions-heading"><div className="mb-3"><h2 id="actions-heading" className="text-lg font-bold text-slate-950">Quick actions</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"><QuickAction href="/dashboard/members/new" label="Add Member" icon={<PlusIcon />} /><QuickAction href="/dashboard/members" label="Assign Membership" icon={<MembershipIcon />} /><QuickAction href="/dashboard/payments/new" label="Record Payment" icon={<PaymentIcon />} /><QuickAction href="/dashboard/attendance" label="Check In" icon={<AttendanceIcon />} /><QuickAction href="/dashboard/trainers/new" label="Add Trainer" icon={<TrainerIcon />} /><QuickAction href="/dashboard/reports" label="View Reports" icon={<ChartIcon />} /><QuickAction href="/dashboard/settings" label="Gym Settings" icon={<SettingsIcon />} /><QuickAction href="/dashboard/settings" label="Manage Users" icon={<UsersIcon />} /></div></section>
  </div>;
}

function DashboardLoading() { return <div className="space-y-6" role="status" aria-label="Loading dashboard"><div className="h-48 animate-pulse rounded-2xl bg-slate-200" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div><span className="sr-only">Loading live dashboard data…</span></div>; }
function Section({ title, id, className = '', children }: { title: string; id: string; className?: string; children: React.ReactNode }) { return <section aria-labelledby={`${id}-heading`} className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><h2 id={`${id}-heading`} className="mb-4 text-lg font-bold text-slate-950">{title}</h2>{children}</section>; }
function KpiCard({ label, value, detail, change, href }: { label: string; value: string; detail: string; change?: number | null; href: string }) { return <Link href={href} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-600">{label}</p>{change !== undefined && <TrendIndicator value={change} />}</div><p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></Link>; }
function TrendIndicator({ value }: { value: number | null }) { if (value === null) return <span className="text-xs font-semibold text-slate-400">New</span>; const positive = value >= 0; return <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-700' : 'text-red-700'}`} aria-label={`${positive ? 'Increased' : 'Decreased'} ${Math.abs(value).toFixed(1)} percent`}>{positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%</span>; }
function MiniMetric({ label, value, tone = 'blue', compact = false }: { label: string; value: number | string; tone?: 'blue' | 'green' | 'amber' | 'red'; compact?: boolean }) { const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800', red: 'bg-red-50 text-red-700' }; return <div className={`rounded-xl p-3 ${colors[tone]}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p><p className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 break-words font-bold`}>{value}</p></div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-900">{value}</span></div>; }
function AlertRow({ visible, label, href, tone }: { visible: boolean; label: string; href: string; tone: 'amber' | 'red' | 'slate' | 'blue' }) { if (!visible) return null; const classes = { amber: 'bg-amber-50 text-amber-900', red: 'bg-red-50 text-red-900', slate: 'bg-slate-100 text-slate-800', blue: 'bg-blue-50 text-blue-900' }; return <Link href={href} className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-blue-500 ${classes[tone]}`}><span>{label}</span><span aria-hidden="true">→</span></Link>; }
function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) { return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">{icon}</span><span className="mt-2 block text-xs font-semibold leading-tight text-slate-800">{label}</span></Link>; }
function EmptyState({ message }: { message: string }) { return <p className="py-8 text-center text-sm text-slate-500">{message}</p>; }
function Icon({ children }: { children: React.ReactNode }) { return <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-5 w-5" strokeWidth={1.8}>{children}</svg>; }
function RefreshIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.2 9A7 7 0 0117.8 6.2L20 9M18.8 15A7 7 0 016.2 17.8L4 15" /></Icon>; }
function PlusIcon() { return <Icon><path strokeLinecap="round" d="M12 5v14M5 12h14" /></Icon>; }
function MembershipIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v16H7zM9 8h6m-6 4h6" /></Icon>; }
function PaymentIcon() { return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></Icon>; }
function AttendanceIcon() { return <Icon><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M12 8v4l2.5 2.5" /></Icon>; }
function TrainerIcon() { return <Icon><circle cx="12" cy="7" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" /></Icon>; }
function ChartIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16v-3m4 3V8m4 8v-6" /></Icon>; }
function SettingsIcon() { return <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4h-2M6 12H4m8-8v2m0 14v2m5.7-14.3l-1.4 1.4M7.7 16.3l-1.4 1.4m0-11.4l1.4 1.4m9.9 9.9l1.4 1.4" /></Icon>; }
function UsersIcon() { return <Icon><circle cx="9" cy="8" r="3" /><path strokeLinecap="round" d="M3 20a6 6 0 0112 0m3-8a3 3 0 100-6m3 14a5 5 0 00-3-4.6" /></Icon>; }
