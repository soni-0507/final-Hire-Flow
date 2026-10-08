import { useCallback, useEffect, useRef, useState } from 'react';

/** Small data-fetching hook with loading / error state and a reload function. */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const latest = useRef(0);

  const run = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (id === latest.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === latest.current) setState({ data: null, loading: false, error: e.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}
