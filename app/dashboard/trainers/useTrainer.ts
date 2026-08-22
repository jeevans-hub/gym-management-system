'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TrainerRecord } from './types';

export type TrainerLoadError = 'not-found' | 'generic' | null;

export function useTrainer(trainerId: string) {
  const router = useRouter();
  const [trainer, setTrainer] = useState<TrainerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TrainerLoadError>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrainer() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trainers/${encodeURIComponent(trainerId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (response.status === 404) {
          setError('not-found');
          return;
        }
        if (!response.ok) throw new Error('Trainer request failed');

        const result = await response.json() as { trainer?: TrainerRecord };
        if (!result.trainer) throw new Error('Invalid Trainer response');
        setTrainer(result.trainer);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError('generic');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTrainer();
    return () => controller.abort();
  }, [retryCount, router, trainerId]);

  return { trainer, loading, error, retry };
}
