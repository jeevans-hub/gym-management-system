/* eslint-disable react-hooks/immutability */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationRecord = {
  _id: string;
  notificationId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};
type Tab = 'all' | 'unread' | 'read';
type ApiResponse = { notifications: NotificationRecord[]; page: number; limit: number; total: number; totalPages: number };

const PAGE_SIZE = 8;
const typeOptions = ['', 'membership-expiring', 'membership-expired', 'payment-due', 'payment-received', 'payment-refunded', 'attendance', 'trainer', 'system', 'warning', 'success', 'info'];
const priorityOptions = ['', 'low', 'medium', 'high', 'critical'];
const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function formatType(type: string) { return type.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Unknown date' : dateFormatter.format(date); }
function iconFor(type: string) { if (type.startsWith('payment')) return '₹'; if (type.startsWith('membership')) return '◆'; if (type === 'attendance') return '◷'; if (type === 'trainer') return '●'; if (type === 'warning') return '!'; if (type === 'success') return '✓'; return 'i'; }
function priorityClass(priority: NotificationRecord['priority']) { return { low: 'bg-slate-100 text-slate-700', medium: 'bg-blue-50 text-blue-700', high: 'bg-amber-50 text-amber-800', critical: 'bg-red-50 text-red-800' }[priority]; }

export default function NotificationsPageClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<NotificationRecord | null>(null);
  const [busyId, setBusyId] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const reloadKey = { current: retryKey };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (priority) params.set('priority', priority);
    if (tab !== 'all') params.set('isRead', String(tab === 'read'));
    try {
      const response = await fetch(`/api/notifications?${params}`, { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401) { router.replace('/login'); return; }
      const body = await response.json() as ApiResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Notifications could not be loaded.');
      setData(body);
      if (body.totalPages > 0 && page > body.totalPages) setPage(body.totalPages);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Notifications could not be loaded.'); }
    finally { setLoading(false); }
  }, [page, priority, router, search, tab, type]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load, retryKey]);

  async function markRead(notification: NotificationRecord) {
    if (notification.isRead) return;
    setBusyId(notification._id);
    try {
      const response = await fetch(`/api/notifications/${notification._id}/read`, { method: 'PUT' });
      if (response.status === 401) { router.replace('/login'); return; }
      if (!response.ok) throw new Error('Notification could not be marked as read.');
      setData((current) => current ? { ...current, notifications: current.notifications.map((item) => item._id === notification._id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item) } : current);
      setAnnouncement('Notification marked as read.');
    } catch (reason) { setAnnouncement(reason instanceof Error ? reason.message : 'Unable to mark notification as read.'); }
    finally { setBusyId(''); }
  }

  async function markAllRead() {
    setBusyId('all');
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (response.status === 401) { router.replace('/login'); return; }
      if (!response.ok) throw new Error('Notifications could not be marked as read.');
      setAnnouncement('All notifications marked as read.');
      await load();
    } catch (reason) { setAnnouncement(reason instanceof Error ? reason.message : 'Unable to mark all notifications as read.'); }
    finally { setBusyId(''); }
  }

  async function deleteNotification() {
    if (!deleting) return;
    setBusyId(deleting._id);
    try {
      const response = await fetch(`/api/notifications/${deleting._id}`, { method: 'DELETE' });
      if (response.status === 401) { router.replace('/login'); return; }
      if (!response.ok) throw new Error('Notification could not be deleted.');
      setDeleting(null); setAnnouncement('Notification deleted.'); await load();
    } catch (reason) { setAnnouncement(reason instanceof Error ? reason.message : 'Unable to delete notification.'); }
    finally { setBusyId(''); }
  }

  function applySearch(event: React.FormEvent) { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }
  function resetFilters() { setSearchInput(''); setSearch(''); setType(''); setPriority(''); setPage(1); setRetryKey((value) => value + 1); }
  const notifications = data?.notifications ?? [];
  const hasFilters = Boolean(search || type || priority);

  return <div className="mx-auto w-full max-w-5xl space-y-5" aria-live="polite">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Communication center</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Notifications</h1><p className="mt-1 text-sm text-slate-500">Stay on top of membership, payment, attendance, and system updates.</p></div><button type="button" onClick={() => void markAllRead()} disabled={busyId === 'all' || !notifications.some((item) => !item.isRead)} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">{busyId === 'all' ? 'Updating…' : 'Mark all as read'}</button></header>
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Notification views">{(['all', 'unread', 'read'] as Tab[]).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(1); }} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${tab === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{value}{value === 'unread' && data && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{data.notifications.filter((item) => !item.isRead).length}</span>}</button>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><form onSubmit={applySearch} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]"><label className="text-sm font-semibold text-slate-700">Search<span className="sr-only"> notifications</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search title or message" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-semibold text-slate-700">Type<select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">All types</option>{typeOptions.slice(1).map((option) => <option key={option} value={option}>{formatType(option)}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Priority<select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">All priorities</option>{priorityOptions.slice(1).map((option) => <option key={option} value={option}>{formatType(option)}</option>)}</select></label><button type="submit" className="self-end rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Search</button></form>{hasFilters && <button type="button" onClick={resetFilters} className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear filters</button>}</section>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h2 className="font-bold text-red-950">Unable to load notifications</h2><p className="mt-1 text-sm text-red-800">{error}</p><button type="button" onClick={() => { reloadKey.current += 1; void load(); }} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-500">Try again</button></div> : loading ? <div className="space-y-3" role="status" aria-label="Loading notifications">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}<span className="sr-only">Loading notifications…</span></div> : notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500" aria-hidden="true">✓</div><h2 className="mt-4 text-lg font-bold text-slate-950">{tab === 'unread' ? 'No unread notifications' : hasFilters ? 'No matching notifications' : 'No notifications yet'}</h2><p className="mt-2 text-sm text-slate-500">{hasFilters ? 'Try changing your filters or search terms.' : 'You are all caught up.'}</p>{hasFilters && <button type="button" onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Clear filters</button>}</div> : <div className="space-y-3">{notifications.map((notification) => <article key={notification._id} className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${notification.isRead ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${notification.isRead ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`} aria-hidden="true">{iconFor(notification.type)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-slate-950">{notification.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${priorityClass(notification.priority)}`}>{notification.priority}</span></div><div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500"><span>{formatType(notification.type)}</span><span aria-hidden="true">·</span><time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>{!notification.isRead && <span className="inline-flex items-center gap-1 font-bold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />Unread</span>}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void markRead(notification)} disabled={notification.isRead || busyId === notification._id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-45">{notification.isRead ? 'Read' : busyId === notification._id ? 'Updating…' : 'Mark as read'}</button><button type="button" onClick={() => setDeleting(notification)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">Delete</button></div></div></div></article>)}</div>}
    {!loading && !error && data && data.total > 0 && <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Showing {notifications.length} of {data.total}</p><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="px-2 text-sm text-slate-600">Page {page} of {Math.max(data.totalPages, 1)}</span><button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {deleting && <DeleteDialog notification={deleting} busy={busyId === deleting._id} onCancel={() => setDeleting(null)} onConfirm={() => void deleteNotification()} />}
  </div>;
}

function DeleteDialog({ notification, busy, onCancel, onConfirm }: { notification: NotificationRecord; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onCancel]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="delete-notification-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="delete-notification-title" className="text-lg font-bold text-slate-950">Delete notification?</h2><p className="mt-2 text-sm text-slate-600">This will permanently remove “{notification.title}”.</p><div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete notification'}</button></div></div></div>;
}
