import { useEffect, useState } from 'react';

import { fetchJson } from '../services/api';

export function useApiCollection(path, fallbackData) {
  const [data, setData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);

      try {
        const response = await fetchJson(path);

        if (isMounted) {
          setData(Array.isArray(response) ? response : fallbackData);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setData(fallbackData);
          setError(requestError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { data, error, isLoading };
}

export function useApiResource(path, fallbackData) {
  const [data, setData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);

      try {
        const response = await fetchJson(path);

        if (isMounted) {
          setData(response ?? fallbackData);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setData(fallbackData);
          setError(requestError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return { data, error, isLoading };
}
