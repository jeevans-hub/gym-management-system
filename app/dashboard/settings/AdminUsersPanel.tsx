'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminUserDialog from './AdminUserDialog';
import AdminUsersTable from './AdminUsersTable';
import { SettingsErrorState, SettingsLoadingState } from './SettingsState';
import type { AdminUser, AdminUserDialogMode, AdminUsersResponse } from './types';

interface OpenDialog {
  mode: AdminUserDialogMode;
  user?: AdminUser;
}

const PAGE_LIMIT = 10;

export default function AdminUsersPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const nextSearch = search.trim();
    if (nextSearch === debouncedSearch) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      setDebouncedSearch(nextSearch);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (role) params.set('role', role);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (response.status === 403) {
          setPermissionDenied(true);
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json() as AdminUsersResponse;
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPermissionDenied(false);
        if (data.totalPages > 0 && page > data.totalPages) setPage(data.totalPages);
      } catch (requestError) {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError('Users could not be retrieved.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [debouncedSearch, page, refreshKey, role, router]);

  function saved(_user: AdminUser, message: string) {
    setDialog(null);
    setSuccessMessage(message);
    setLoading(true);
    setError('');
    setRefreshKey((value) => value + 1);
  }

  if (permissionDenied) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="font-bold">Administrator access required</h2>
        <p className="mt-1 text-sm">Staff accounts cannot view or manage system users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-950">
        <p className="font-semibold">Access safety</p>
        <p className="mt-1">At least one Admin must remain. Staff cannot administer users or change gym settings.</p>
      </div>

      {successMessage && <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>}

      <section aria-labelledby="admin-users-heading" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="admin-users-heading" className="text-lg font-bold text-gray-950">Users</h2>
              <p className="mt-1 text-sm text-gray-500">Manage administrator and staff access.</p>
            </div>
            <button type="button" onClick={() => { setSuccessMessage(''); setDialog({ mode: 'create' }); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Add user</button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div>
              <label htmlFor="admin-user-search" className="text-sm font-semibold text-gray-700">Search users</label>
              <input id="admin-user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Search name or email" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label htmlFor="admin-role-filter" className="text-sm font-semibold text-gray-700">Role</label>
              <select id="admin-role-filter" value={role} onChange={(event) => { setLoading(true); setError(''); setRole(event.target.value); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5"><SettingsLoadingState message="Loading users…" /></div>
        ) : error ? (
          <div className="p-5"><SettingsErrorState message={error} onRetry={() => { setLoading(true); setError(''); setRefreshKey((value) => value + 1); }} /></div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center"><p className="font-semibold text-gray-800">No users found</p><p className="mt-1 text-sm text-gray-500">Adjust the search or role filter.</p></div>
        ) : (
          <AdminUsersTable users={users} onView={(user) => setDialog({ mode: 'view', user })} onEdit={(user) => { setSuccessMessage(''); setDialog({ mode: 'edit', user }); }} />
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-gray-500">{total === 0 ? 'No users to show' : `Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total} users`}</p>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <button type="button" onClick={() => { setLoading(true); setPage((value) => value - 1); }} disabled={page <= 1} className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <span className="whitespace-nowrap text-sm font-medium text-gray-600">Page {Math.min(page, Math.max(totalPages, 1))} of {Math.max(totalPages, 1)}</span>
              <button type="button" onClick={() => { setLoading(true); setPage((value) => value + 1); }} disabled={page >= totalPages || totalPages === 0} className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>

      {dialog && <AdminUserDialog mode={dialog.mode} user={dialog.user} onClose={() => setDialog(null)} onSaved={saved} />}
    </div>
  );
}
