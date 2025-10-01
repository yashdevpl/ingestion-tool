import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface IngestionStatus {
  status: string;
  requestId: string;
}

export interface FileIngestionStatus {
  fileId: string;
  requestId: string;
  status: string;
  isComplete: boolean;
  isFailed: boolean;
  progress: number;
}

// Define status progression mapping
const STATUS_PROGRESS = {
  FILE_UPLOADED: 10,
  FILE_UPLOAD_FAILED: 0,
  PROCESSING_STARTED: 30,
  PROCESSING_COMPLETE: 60,
  KEYWORD_DETECTION_STARTED: 70,
  KEYWORD_DETECTION_COMPLETE: 100,
  KEYWORD_DETECTION_FAILED: 0,
  PROCESSING_FAILED: 0,
  COMPLETED: 100,
};

export const COMPLETE_STATUSES = ["KEYWORD_DETECTION_COMPLETE", "COMPLETED"];
export const FAILED_STATUSES = [
  "FILE_UPLOAD_FAILED",
  "KEYWORD_DETECTION_FAILED",
  "PROCESSING_FAILED",
];

interface UseIngestionPollingProps {
  files: Array<{
    id: string;
    fileType: string;
    isUploaded?: boolean;
    isIngested?: boolean;
    requestId?: string;
  }>;
  baseUrl: string;
  isEnabled: boolean;
  pollingInterval?: number;
  onFileStatusChange?: (fileId: string, status: FileIngestionStatus) => void;
}

export const useIngestionPolling = ({
  files,
  baseUrl,
  isEnabled,
  pollingInterval = 3000,
  onFileStatusChange,
}: UseIngestionPollingProps) => {
  const [statusMap, setStatusMap] = useState<
    Record<string, FileIngestionStatus>
  >({});
  const [isPolling, setIsPolling] = useState(false);
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const trackedFiles = useRef<Set<string>>(new Set());
  // Track files that were ever started for polling
  const everTrackedFiles = useRef<Set<string>>(new Set());

  // Create a stable key for memoization to prevent infinite re-renders
  const filesKey = useMemo(() => {
    return files
      .map((f) => `${f.id}-${f.isUploaded}-${f.isIngested}-${f.requestId}`)
      .sort()
      .join("|");
  }, [files]);

  // Memoize files to prevent unnecessary re-renders
  const memoizedFiles = useMemo(() => {
    return files.map((f) => ({
      id: f.id,
      fileType: f.fileType,
      isUploaded: f.isUploaded,
      isIngested: f.isIngested,
      requestId: f.requestId,
    }));
  }, [filesKey]);

  const stopPollingForFile = useCallback((fileId: string) => {
    if (intervalRefs.current[fileId]) {
      clearInterval(intervalRefs.current[fileId]);
      delete intervalRefs.current[fileId];
    }
    // Remove from active tracking but keep in ever-tracked
    trackedFiles.current.delete(fileId);
  }, []);

  const stopAllPolling = useCallback(() => {
    Object.keys(intervalRefs.current).forEach((fileId) => {
      stopPollingForFile(fileId);
    });
    setIsPolling(false);
  }, [stopPollingForFile]);

  const pollFileStatus = useCallback(
    async (file: { id: string; fileType: string; requestId?: string }) => {
      const requestId = file?.requestId;
      if (!requestId) {
        console.warn(`No requestId found for file ${file.id}`);
        return;
      }

      try {
        // Determine API endpoint based on file type
        const endpoint =
          file.fileType === "sms" || file.fileType === "text"
            ? `/api/ingestion/status/${requestId}/sms`
            : `/api/ingestion/status/${requestId}`;

        const response = await fetch(`${baseUrl}${endpoint}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: IngestionStatus = await response.json();

        const progress =
          STATUS_PROGRESS[data.status as keyof typeof STATUS_PROGRESS] ?? 0;
        const isComplete = COMPLETE_STATUSES.includes(data.status);
        const isFailed = FAILED_STATUSES.includes(data.status);

        const newStatus: FileIngestionStatus = {
          fileId: file.id,
          requestId,
          status: data.status,
          isComplete,
          isFailed,
          progress,
        };

        setStatusMap((prev) => ({
          ...prev,
          [file.id]: newStatus,
        }));

        // Notify parent component of status change
        onFileStatusChange?.(file.id, newStatus);

        // Stop polling if complete or failed
        if (isComplete || isFailed) {
          stopPollingForFile(file.id);
          console.log(
            `Stopped polling for file ${file.id}. Final status: ${data.status}`
          );
        }
      } catch (error) {
        console.error(`Error polling status for file ${file.id}:`, error);
        const errorStatus: FileIngestionStatus = {
          fileId: file.id,
          requestId: requestId!,
          status: "POLLING_ERROR",
          isComplete: false,
          isFailed: true,
          progress: 0,
        };

        setStatusMap((prev) => ({
          ...prev,
          [file.id]: errorStatus,
        }));

        onFileStatusChange?.(file.id, errorStatus);
        stopPollingForFile(file.id);
      }
    },
    [baseUrl, onFileStatusChange, stopPollingForFile]
  );

  const startPollingForFile = useCallback(
    (file: {
      id: string;
      fileType: string;
      isUploaded?: boolean;
      isIngested?: boolean;
      requestId?: string;
    }) => {
      // Only start polling if file is uploaded, ingested, has requestId, and not already being tracked
      if (
        !file.isUploaded ||
        !file.isIngested ||
        !file?.requestId ||
        trackedFiles.current.has(file.id)
      ) {
        return;
      }

      console.log(
        `Starting polling for file ${file.id} with requestId: ${file.requestId}`
      );
      trackedFiles.current.add(file.id);
      everTrackedFiles.current.add(file.id); // Track that we started polling for this file

      // Initialize status
      const initialStatus: FileIngestionStatus = {
        fileId: file.id,
        requestId: file.requestId,
        status: "INITIALIZING",
        isComplete: false,
        isFailed: false,
        progress: 0,
      };

      setStatusMap((prev) => ({
        ...prev,
        [file.id]: initialStatus,
      }));

      onFileStatusChange?.(file.id, initialStatus);

      // Start polling for this file
      const intervalId = setInterval(() => {
        pollFileStatus(file);
      }, pollingInterval);

      intervalRefs.current[file.id] = intervalId;

      // Poll immediately
      pollFileStatus(file);
    },
    [pollingInterval, onFileStatusChange, pollFileStatus]
  );

  const checkAndStartPolling = useCallback(() => {
    if (!isEnabled) return;

    let hasActivePolling = false;

    memoizedFiles.forEach((file) => {
      if (
        file.isUploaded &&
        file.isIngested &&
        file.requestId &&
        !trackedFiles.current.has(file.id)
      ) {
        startPollingForFile({
          id: file.id,
          fileType: file.fileType,
          isUploaded: file.isUploaded,
          isIngested: file.isIngested,
          requestId: file.requestId,
        });
        hasActivePolling = true;
      } else if (intervalRefs.current[file.id]) {
        hasActivePolling = true;
      }
    });

    setIsPolling(hasActivePolling);
  }, [isEnabled, memoizedFiles, startPollingForFile]);

  useEffect(() => {
    if (isEnabled && memoizedFiles.length > 0) {
      checkAndStartPolling();
    }
  }, [isEnabled, checkAndStartPolling, memoizedFiles.length]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopAllPolling();
    };
  }, [stopAllPolling]);

  // Calculate allComplete based on files that were ever tracked
  const allComplete = useMemo(() => {
    const everTrackedFileIds = Array.from(everTrackedFiles.current);

    // If no files have been tracked yet, return false
    if (everTrackedFileIds.length === 0) {
      return false;
    }

    // Check if all ever-tracked files have a status and are complete or failed
    return everTrackedFileIds.every((fileId) => {
      const status = statusMap[fileId];
      return status && (status.isComplete || status.isFailed);
    });
  }, [statusMap, everTrackedFiles.current.size]); // Depend on size to trigger recalculation

  const activePollingCount = Object.keys(intervalRefs.current).length;
  const trackedFileIds = Array.from(everTrackedFiles.current);

  return {
    statusMap,
    isPolling: activePollingCount > 0,
    allComplete,
    trackedFileIds, // Return all files that were ever tracked
    activePollingCount,
    stopAllPolling,
  };
};
