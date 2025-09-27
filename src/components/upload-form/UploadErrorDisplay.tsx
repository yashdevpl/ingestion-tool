import React from "react";

interface UploadError {
  message: string;
  apiType: "SMS" | "Call" | "System";
  failedCount: number;
  failedFiles?: any[];
}

interface UploadErrorDisplayProps {
  uploadError: UploadError | null;
  onRetry: () => void;
  onDismiss: () => void;
  processingLoader: boolean;
}

export const UploadErrorDisplay: React.FC<UploadErrorDisplayProps> = ({
  uploadError,
  onRetry,
  onDismiss,
  processingLoader,
}) => {
  if (!uploadError) return null;

  return (
    <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="text-red-500 text-xl">⚠️</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-red-800">Upload Error</h3>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
              {uploadError.apiType} API
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              {uploadError.failedCount} file
              {uploadError.failedCount > 1 ? "s" : ""} failed
            </span>
          </div>
          <p className="text-sm text-red-700 mb-3">{uploadError.message}</p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onRetry}
              disabled={processingLoader}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded transition-colors flex items-center gap-1"
            >
              {processingLoader ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry Failed Files'
              )}
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};