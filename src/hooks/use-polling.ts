import { useCallback, useEffect, useRef, useState } from "react";

type PollingStatus = "idle" | "polling" | "success" | "error";
type RetryDelayStrategy = (retryCount: number) => number;

interface PollingState<T> {
  data?: T;
  error?: unknown;
  status: PollingStatus;
}

interface UsePollingOptions<T> {
  key: string;
  enabled?: boolean;
  pollingInterval: number;
  maxRetries?: number;
  retryDelay?: number | RetryDelayStrategy;
  pollingFunction: () => Promise<T>;
  shouldContinue: (data: T) => boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

export const usePolling = <T>() => {
  const timers = useRef<Map<string, any>>(new Map());
  const retryCounts = useRef<Map<string, number>>(new Map());
  const [pollingStates, setPollingStates] = useState<
    Map<string, PollingState<T>>
  >(new Map());

  const stopPolling = useCallback((key: string) => {
    const timerId = timers.current.get(key);
    if (timerId) {
      clearTimeout(timerId);
      timers.current.delete(key);
    }
    retryCounts.current.delete(key);
    setPollingStates((prev) => {
      const newStates = new Map(prev);
      newStates.delete(key);
      return newStates;
    });
  }, []);

  const startPolling = useCallback(
    ({
      key,
      enabled = true,
      pollingInterval,
      maxRetries = 3,
      retryDelay = 1000,
      pollingFunction,
      shouldContinue,
      onSuccess,
      onError,
    }: UsePollingOptions<T>) => {
      if (!enabled) {
        stopPolling(key);
        return;
      }

      const execute = async (isRetry: boolean) => {
        try {
          const data = await pollingFunction();
          setPollingStates(
            (prev) => new Map(prev.set(key, { data, status: "success" }))
          );

          if (shouldContinue(data)) {
            const timer = setTimeout(() => execute(false), pollingInterval);
            timers.current.set(key, timer);
          } else {
            stopPolling(key);
            onSuccess?.(data);
          }
          retryCounts.current.delete(key);
        } catch (error) {
          const currentRetries = retryCounts.current.get(key) || 0;

          if (currentRetries < maxRetries && !isRetry) {
            const delay =
              typeof retryDelay === "function"
                ? retryDelay(currentRetries)
                : retryDelay;

            retryCounts.current.set(key, currentRetries + 1);
            const timer = setTimeout(() => execute(true), delay);
            timers.current.set(key, timer);
            setPollingStates(
              (prev) => new Map(prev.set(key, { error, status: "error" }))
            );
          } else {
            stopPolling(key);
            onError?.(error);
            setPollingStates(
              (prev) => new Map(prev.set(key, { error, status: "error" }))
            );
          }
        }
      };

      stopPolling(key);
      setPollingStates((prev) => new Map(prev.set(key, { status: "polling" })));
      execute(false);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer, key) => {
        clearTimeout(timer);
        timers.current.delete(key);
      });
    };
  }, []);

  return {
    pollingStates: Object.fromEntries(pollingStates) as Record<
      string,
      PollingState<T>
    >,
    startPolling,
    stopPolling,
  };
};
