import { useEffect, useState, useRef } from "react";
import { FileRecord } from "../types/common";
export interface FileUpdate {
  fileId?: number;
  status?: string;
  timestamp?: string;
  data: FileRecord;
  [key: string]: any;
}

interface UseFileUpdatesOptions {
  url: string;
  userId?: string;
  clientId?: string;
  heartbeatInterval?: number; // optional ping interval
}

export const useUpdateStreaming = ({
  url,
  userId,
  clientId,
  heartbeatInterval = 20000,
}: UseFileUpdatesOptions) => {
  const [updates, setUpdates] = useState<FileUpdate[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (userId) headers["X-User-Id"] = userId;
    if (clientId) headers["X-Client-Id"] = clientId;

    // Build URL with optional query params if needed
    const fullUrl = new URL(url, window.location.origin).toString();

    // Create EventSource
    const es = new EventSource(fullUrl, { withCredentials: false });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status && data.data) {
          setUpdates((prev) => [
            ...prev,
            { ...data, data: JSON.parse(data?.data) },
          ]);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      console.warn("SSE connection lost. Reconnecting...");
      es.close();
      // reconnect after short delay
      setTimeout(() => {
        if (
          !eventSourceRef.current ||
          eventSourceRef.current.readyState === 2
        ) {
          eventSourceRef.current = new EventSource(fullUrl, {
            withCredentials: false,
          });
        }
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [url, userId, clientId]);

  return { updates };
};
