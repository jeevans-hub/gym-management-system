'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteMemberDialog from './DeleteMemberDialog';
import MembersFilters from './MembersFilters';
import MembersPagination from './MembersPagination';
import { MembersEmptyState, MembersErrorState, MembersLoadingState } from './MembersStates';
import MembersTable from './MembersTable';
import type { MemberListItem, MembersResponse, StatusFilter } from './types';

const PAGE_SIZE = 10;

const initialResponse: MembersResponse = {
  members: [],
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export default function MembersPageClient() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MembersResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [memberToDelete, setMemberToDelete] = useState<MemberListItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMembers() {
      setLoading(true);
      setError(false);

      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);

      try {
        const response = await fetch(`/api/members?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }

        if (!response.ok) throw new Error('Member request failed');

        const result = await response.json() as MembersResponse;
        if (!Array.isArray(result.members)) throw new Error('Invalid member response');
        setData(result);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadMembers();
    return () => controller.abort();
  }, [page, retryCount, router, search, status]);

  const handleStatusChange = useCallback((value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  }, []);

  const closeDeleteDialog = useCallback(() => setMemberToDelete(null), []);

  const handleDeleted = useCallback(() => {
    setMemberToDelete(null);
    if (data.members.length === 1 && page > 1) setPage((current) => current - 1);
    else setRetryCount((count) => count + 1);
  }, [data.members.length, page]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Members</h1>
            {!loading && !error && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {data.total} total
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">
            Search, filter and review your gym&apos;s member directory.
          </p>
        </div>
        <Link
          href="/dashboard/members/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:self-auto"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Add Member
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Member directory">
        <MembersFilters
          search={searchInput}
          status={status}
          loading={loading}
          onSearchChange={setSearchInput}
          onStatusChange={handleStatusChange}
        />

        {loading ? (
          <MembersLoadingState />
        ) : error ? (
          <MembersErrorState onRetry={() => setRetryCount((count) => count + 1)} />
        ) : data.members.length === 0 ? (
          <MembersEmptyState search={search} status={status} />
        ) : (
          <MembersTable members={data.members} onDelete={setMemberToDelete} />
        )}

        {!error && !loading && (
          <MembersPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            loading={loading}
            onPageChange={setPage}
          />
        )}
      </section>

      {memberToDelete && (
        <DeleteMemberDialog member={memberToDelete} onClose={closeDeleteDialog} onDeleted={handleDeleted} />
      )}
    </div>
  );
}
