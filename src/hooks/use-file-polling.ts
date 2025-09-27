import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

interface PollingOptions<T> {
  url: string;
  interval?: number; // milliseconds
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export function useFilePolling<T = any>({
  url,
  interval = 5000,
  onSuccess,
  onError,
}: PollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(
    async (query: string) => {
      try {
        setLoading(true);
        const res = await axios.get<T>(`${url}?${query.length ? query : ""}`);
        setData(res.data);
        setError(null);
        if (onSuccess) onSuccess(res.data);
      } catch (err: any) {
        setError(err);
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
    },
    [url, onSuccess, onError]
  );

  const start = useCallback(
    (data: string) => {
      if (isActive) return;
      setIsActive(true);
      fetchData(``); // run immediately
      timerRef.current = setInterval(() => fetchData(data), interval);
    },
    [isActive, interval, fetchData]
  );

  const stop = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { data, loading, error, start, stop, isActive, refetch: fetchData };
}
