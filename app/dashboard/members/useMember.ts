'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberRecord } from './types';

export type MemberLoadError = 'not-found' | 'generic' | null;

export function useMember(memberId: string) {
  const router = useRouter();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MemberLoadError>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMember() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
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
        if (!response.ok) throw new Error('Member request failed');

        const result = await response.json() as { member?: MemberRecord };
        if (!result.member) throw new Error('Invalid member response');
        setMember(result.member);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError('generic');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadMember();
    return () => controller.abort();
  }, [memberId, retryCount, router]);

  return { member, loading, error, retry };
}
