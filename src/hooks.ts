import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
  updatedAt?: number;
  reload: () => void;
}

/**
 * Runs an async loader, re-running it when `deps` change and, optionally,
 * every `refreshMs`. Data from a previous set of deps is dropped immediately
 * (no showing USD numbers under an EUR label), while a plain refresh keeps the
 * current data on screen until the new response arrives.
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  refreshMs?: number,
): AsyncState<T> {
  const [state, setState] = useState<Omit<AsyncState<T>, 'reload'>>({ loading: true });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps);
  const lastKey = useRef(key);
  const loadRef = useRef(load);

  // Keep the latest loader without making it a dependency (it is a new arrow
  // function on every render). Declared first so it runs before the fetch below.
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    const depsChanged = lastKey.current !== key;
    lastKey.current = key;
    setState((s) => (depsChanged ? { loading: true } : { ...s, loading: true, error: undefined }));

    loadRef
      .current(controller.signal)
      .then((data) => setState({ data, loading: false, updatedAt: Date.now() }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, error, loading: false }));
      });
    return () => controller.abort();
  }, [key, tick]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode); keep it in memory only */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') return current;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('mp:theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}

/** Returns 'up' / 'down' for ~1s after `value` changes, to flash a cell. */
export function useFlash(value: number) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'' | 'up' | 'down'>('');
  useEffect(() => {
    if (value === prev.current) return;
    setFlash(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const id = setTimeout(() => setFlash(''), 1200);
    return () => clearTimeout(id);
  }, [value]);
  return flash;
}

/** Re-renders every `ms` so relative times ("12 s ago") stay current. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
