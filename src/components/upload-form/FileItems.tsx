import { AlertCircle, Check, Clock } from "lucide-react";
import { FileRecord } from "../../types/common";

export const FileItem: React.FC<{
  fileRecord: FileRecord;
  onDelete: (id: string) => void;
  onUpdateMetadata: (
    id: string,
    metadata: any,
    isReferenceFound: boolean
  ) => void;
  errors?: Record<string, string>;
  showExpandButton?: boolean;
  index?: number;
}> = ({
  fileRecord,
  onDelete,
  onUpdateMetadata,
  errors = {},
  showExpandButton = true,
  index = 0,
}) => {
   const hasErrors = errors && Object.keys(errors).length > 0;

  const steps = [
    { key: "isRead", label: "Read" },
    { key: "isUploaded", label: "Uploaded" },
    { key: "isIngested", label: "Ingested" },
  ];

  const getStepColor = (stepKey:string) => {
    if (fileRecord[stepKey as keyof FileRecord]) {
      if (stepKey === "isIngested") return "bg-green-500";
      if (stepKey === "isUploaded") return "bg-blue-500";
      return "bg-slate-500";
    }
    return "bg-slate-300";
  };

  const getStatusIcon = () => {
    if (fileRecord.isIngested)
      return <Check className="h-4 w-4 text-green-500" />;
    if (hasErrors) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const formatFileSize = (sizeStr: string) => {
    if (!sizeStr) return "0 B";
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return sizeStr; // Return original if not a number
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-3 bg-white border-b border-slate-100 px-4 py-3 hover:bg-slate-50 transition-colors"
      style={{ height: 56 }}
    >
      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono w-8 flex-shrink-0">
            #{fileRecord.id}
          </span>
          <p className="truncate text-sm font-medium text-slate-900">
            {fileRecord.fileName}
          </p>
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {fileRecord.fileType}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatFileSize(fileRecord.fileSize)} •{" "}
          {formatDate(fileRecord.uploadedAt)}
        </p>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {steps.map((step) => (
            <div
              key={step.key}
              title={step.label}
              className={`h-2.5 w-2.5 rounded-full ${getStepColor(step.key)}`}
            />
          ))}
        </div>

        {/* Status icon */}
        <div className="w-4 h-4 flex items-center justify-center">
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};
