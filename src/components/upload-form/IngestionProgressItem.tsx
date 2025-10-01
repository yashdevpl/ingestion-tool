import React from "react";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { FileIngestionStatus } from "../../hooks/use-ingestion-polling";

interface IngestionProgressItemProps {
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  };
  status?: FileIngestionStatus;
}
export const getStatusText = (status: string) => {
  if (!status) return "Waiting...";

  switch (status) {
    case "INITIALIZING":
      return "Initializing...";
    case "FILE_UPLOADED":
      return "File Uploaded";
    case "FILE_UPLOAD_FAILED":
      return "Upload Failed";
    case "PROCESSING_STARTED":
      return "Processing Started";
    case "PROCESSING_COMPLETE":
      return "Processing Complete";
    case "KEYWORD_DETECTION_STARTED":
      return "Analyzing Keywords";
    case "KEYWORD_DETECTION_COMPLETE":
      return "Analysis Complete";
    case "KEYWORD_DETECTION_FAILED":
      return "Analysis Failed";
    case "PROCESSING_FAILED":
      return "Processing Failed";
    case "POLLING_ERROR":
      return "Status Check Failed";
    default:
      return status;
  }
};

export const IngestionProgressItem: React.FC<IngestionProgressItemProps> = ({
  file,
  status,
}) => {
  const getStatusIcon = () => {
    if (!status) return <Clock className="h-3 w-3 text-gray-400" />;

    if (status.isFailed) {
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }

    if (status.isComplete) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }

    return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
  };

  const getStatusColor = () => {
    if (!status) return "bg-gray-50 text-gray-700 border-gray-200";

    if (status.isFailed) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (status.isComplete) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900">
            {file.fileName}
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>•</span>
            <span className="capitalize">{file.fileType}</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={status?.progress || 0} className="h-1.5 w-full" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {getStatusText(status?.status || "")}
              </span>
              <span className="text-xs text-gray-500">
                {status?.progress || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ml-3">
        <Badge
          variant="outline"
          className={`text-xs px-2 py-1 ${getStatusColor()}`}
        >
          {status?.isComplete
            ? "Complete"
            : status?.isFailed
              ? "Failed"
              : status
                ? "Processing"
                : "Queued"}
        </Badge>
      </div>
    </div>
  );
};
