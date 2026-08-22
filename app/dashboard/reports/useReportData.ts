'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function useReportData<T>(url: string | null, initialData: T) {
  const router = useRouter();
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(url!, { signal: controller.signal });
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const body = (await response.json()) as T & { error?: string };
        if (!response.ok) throw new Error(body.error || 'The report could not be loaded.');
        setData(body);
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'The report could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [retryKey, router, url]);

  return { data, loading: Boolean(url) && loading, error, retry: () => setRetryKey((value) => value + 1) };
}
