'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeleteTrainerDialog from './DeleteTrainerDialog';
import TrainersFilters from './TrainersFilters';
import TrainersPagination from './TrainersPagination';
import { TrainersEmptyState, TrainersErrorState, TrainersLoadingState } from './TrainersStates';
import TrainersTable from './TrainersTable';
import type { TrainerListItem, TrainersResponse, TrainerStatusFilter } from './types';

const PAGE_SIZE = 10;

const initialResponse: TrainersResponse = {
  trainers: [],
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export default function TrainersPageClient() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TrainerStatusFilter>('all');
  const [specialization, setSpecialization] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TrainersResponse>(initialResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [trainerToDelete, setTrainerToDelete] = useState<TrainerListItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrainers() {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (specialization) params.set('specialization', specialization);

      try {
        const response = await fetch(`/api/trainers?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error('Trainer request failed');

        const result = await response.json() as TrainersResponse;
        if (!Array.isArray(result.trainers)) throw new Error('Invalid Trainer response');
        setData(result);
        setSpecializations((current) => Array.from(new Set([
          ...current,
          ...result.trainers.map((trainer) => trainer.specialization).filter(Boolean),
          ...(specialization ? [specialization] : []),
        ])).sort((left, right) => left.localeCompare(right)));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTrainers();
    return () => controller.abort();
  }, [page, retryCount, router, search, specialization, status]);

  const handleStatusChange = useCallback((value: TrainerStatusFilter) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleSpecializationChange = useCallback((value: string) => {
    setSpecialization(value);
    setPage(1);
  }, []);

  const closeDeleteDialog = useCallback(() => setTrainerToDelete(null), []);

  const handleDeleted = useCallback(() => {
    setTrainerToDelete(null);
    if (data.trainers.length === 1 && page > 1) setPage((current) => current - 1);
    else setRetryCount((count) => count + 1);
  }, [data.trainers.length, page]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Trainers</h1>
            {!loading && !error && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{data.total} total</span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-500 sm:text-base">
            Manage your coaching team, specialties and professional records.
          </p>
        </div>
        <Link
          href="/dashboard/trainers/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:self-auto"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Add Trainer
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-label="Trainer directory">
        <TrainersFilters
          search={searchInput}
          status={status}
          specialization={specialization}
          specializations={specializations}
          loading={loading}
          onSearchChange={setSearchInput}
          onStatusChange={handleStatusChange}
          onSpecializationChange={handleSpecializationChange}
        />

        {loading ? (
          <TrainersLoadingState />
        ) : error ? (
          <TrainersErrorState onRetry={() => setRetryCount((count) => count + 1)} />
        ) : data.trainers.length === 0 ? (
          <TrainersEmptyState search={search} status={status} specialization={specialization} />
        ) : (
          <TrainersTable trainers={data.trainers} onDelete={setTrainerToDelete} />
        )}

        {!error && !loading && (
          <TrainersPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            loading={loading}
            onPageChange={setPage}
          />
        )}
      </section>

      {trainerToDelete && (
        <DeleteTrainerDialog trainer={trainerToDelete} onClose={closeDeleteDialog} onDeleted={handleDeleted} />
      )}
    </div>
  );
}
