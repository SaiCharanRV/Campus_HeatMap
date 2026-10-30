import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/axios.js';

/**
 * Runs an async loader whenever `deps` change.
 * `reload()` refetches without clearing the current data (no flash on live updates).
 */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
