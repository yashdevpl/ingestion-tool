

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

interface UploadStatus {
  [fileId: string]: {
    progress: number;
    status: string; // Using string to accept any API status
    fileName: string;
    error?: string;
  };
}

interface UploadStatusContextType {
  uploadStatus: UploadStatus;
  updateUploadStatus: (
    fileId: string,
    data: Partial<UploadStatus[string]>
  ) => void;
  resetUploadStatus: (fileId: string) => void;
  clearAllStatus: () => void;
  setStopPolling: Dispatch<SetStateAction<boolean>>;
  stopPolling: boolean;
}

const UploadStatusContext = createContext<UploadStatusContextType | undefined>(
  undefined
);

export function UploadStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [stopPolling, setStopPolling] = useState(false);

  const updateUploadStatus = (
    fileId: string,
    data: Partial<UploadStatus[string]>
  ) => {
    setUploadStatus((prev) => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        ...data,
      },
    }));
  };

  const resetUploadStatus = (fileId: string) => {
    setUploadStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[fileId];
      return newStatus;
    });
  };

  const clearAllStatus = () => {
    setUploadStatus({});
  };

  useEffect(() => {
    if (stopPolling) {
      setStopPolling(false);
    }
  }, [stopPolling]);

  return (
    <UploadStatusContext.Provider
      value={{
        setStopPolling,
        stopPolling,
        uploadStatus,
        updateUploadStatus,
        resetUploadStatus,
        clearAllStatus,
      }}
    >
      {children}
    </UploadStatusContext.Provider>
  );
}

export function useUploadStatus() {
  const context = useContext(UploadStatusContext);
  if (context === undefined) {
    throw new Error(
      "useUploadStatus must be used within a UploadStatusProvider"
    );
  }
  return context;
}
