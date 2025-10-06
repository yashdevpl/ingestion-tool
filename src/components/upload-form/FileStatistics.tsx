import React from "react";
import type { FileRecord } from "../../types/common";

interface FileStatisticsProps {
  files: FileRecord[];
  validationErrors: Record<string, Record<string, string>>;
}

export const FileStatistics: React.FC<FileStatisticsProps> = ({
  files,
  validationErrors,
}) => {
  const getStatusCounts = {
    completed: files.filter((f) => f.isIngested).length,
    processing: files.filter((f) => f.isUploaded && !f.isIngested).length,
    pending: files.filter((f) => !f.isRead).length,
    error: files.filter(
      (f) =>
        validationErrors[f.id] &&
        Object.keys(validationErrors[f.id]).length > 0
    ).length,
  };

  return (
    <div className="flex-shrink-0 bg-white px-6 py-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Upload Progress Overview
          </h3>
          <p className="text-xs text-slate-600">
            Current status of all files in the directory
          </p>
        </div>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div className="text-center">
            <div className="font-semibold text-slate-900">
              {files.length.toLocaleString()}
            </div>
            <div className="text-slate-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">
              {getStatusCounts.completed.toLocaleString()}
            </div>
            <div className="text-slate-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-blue-600">
              {getStatusCounts.processing.toLocaleString()}
            </div>
            <div className="text-slate-500">Processing</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-yellow-600">
              {getStatusCounts.pending.toLocaleString()}
            </div>
            <div className="text-slate-500">Pending</div>
          </div>
          {getStatusCounts.error > 0 && (
            <div className="text-center">
              <div className="font-semibold text-red-600">
                {getStatusCounts.error.toLocaleString()}
              </div>
              <div className="text-slate-500">Error</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};