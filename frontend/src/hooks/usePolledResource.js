import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Polls a fetcher on an interval, keeping the last successful payload on screen
 * when a refresh fails so a transient upstream error never blanks the map.
 * `fetcher` must be referentially stable (a module-level function).
 * `enabled` false means no request at all, which is how the bus feed stays free
 * until someone turns a bus line on.
 */
export function usePolledResource(fetcher, intervalMs = 0, enabled = true) {
  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: true,
    updatedAt: null,
  });
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetcher(controller.signal);
      if (controller.signal.aborted) return;
      setState({ data, error: null, isLoading: false, updatedAt: Date.now() });
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      setState((prev) => ({ ...prev, error, isLoading: false }));
    }
  }, [fetcher, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    if (!intervalMs) return () => abortRef.current?.abort();

    let timer = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(load, intervalMs);
    };

    // Polling a backgrounded tab burns the MBTA rate limit for data nobody is
    // looking at, so pause while hidden and refresh immediately on return.
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else {
        load();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [load, intervalMs, enabled]);

  return { ...state, refresh: load };
}
