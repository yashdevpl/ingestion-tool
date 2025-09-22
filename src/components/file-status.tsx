import React from "react";

import { Badge } from "./ui/badge";

interface FileStatusProps {
  file?: { processing_status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | string };
}

const statusStyles: Record<string, { className: string; label: React.ReactNode }> = {
  COMPLETED: {
    className: "px-1.5 py-1 bg-green-200 text-green-800 hover:bg-green-200",
    label: "Completed"
  },
  IN_PROGRESS: {
    className: "px-1.5 py-1 bg-blue-200 text-blue-800 hover:bg-blue-200",
    label: "Processing"
  },
  FAILED: {
    className: "px-1.5 py-1 bg-red-400 text-white hover:bg-red-400",
    label: "Failed"
  },
  UNKNOWN: {
    className: "px-1.5 py-1 bg-gray-200 text-gray-800 hover:bg-gray-200",
    label: "Unknown"
  }
};

const FileStatus: React.FC<FileStatusProps> = ({ file }) => {
  if (!file) return null;

  const status = file.processing_status || "UNKNOWN";
  const { className, label } = statusStyles[status] || statusStyles.UNKNOWN;

  return <Badge className={`w-max shadow-none ${className}`}>{label}</Badge>;
};

export default FileStatus;
