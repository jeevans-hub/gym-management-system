'use client';

import { useEffect, useState } from 'react';

export default function useDebouncedReportSearch(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}
