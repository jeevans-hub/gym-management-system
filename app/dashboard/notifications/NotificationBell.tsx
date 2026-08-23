'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/notifications?isRead=false&limit=1', { cache: 'no-store' });
        if (response.ok) { const body = await response.json() as { total?: number }; if (active) setUnread(body.total ?? 0); }
      } catch { /* Header remains usable if notifications are temporarily unavailable. */ }
    }
    void load();
    return () => { active = false; };
  }, []);
  return <button type="button" onClick={() => router.push('/dashboard/notifications')} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"><svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m10-2V11a7 7 0 10-14 0v4l-2 2h18l-2-2zm-5 5a3 3 0 01-6 0" /></svg>{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}</button>;
}
