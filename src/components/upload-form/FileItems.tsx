// File Item Component

import { CheckLine, ChevronDown, FileText, Phone, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import MetaDataForm from "./metadata-form";
import { Tooltip, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Progress } from "../ui/progress";
import { useLayoutEffect, useState } from "react";
import { useUploadStatus } from "../../context/upload-status-context";
import { TooltipContent } from "@radix-ui/react-tooltip";
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
}> = ({
  fileRecord,
  onDelete,
  onUpdateMetadata,
  errors = {},
  showExpandButton = true,
}) => {
  const { uploadStatus } = useUploadStatus();
  // Auto-expand if there are errors for this file
  const hasErrors = errors && Object.keys(errors).length > 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const [metadata, setMetadata] = useState(fileRecord.metadata || {});

  const handleMetadataChange = (
    field: string,
    value: string | Date | undefined
  ) => {
    const updatedMetadata = { ...metadata, [field]: value };
    setMetadata(updatedMetadata);
    onUpdateMetadata(
      fileRecord.id,
      updatedMetadata,
      fileRecord.isReferenceFound
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getStatusDisplayText = (status?: string) => {
    if (!status) return "Waiting...";

    // Convert API status to display text
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const fileStatus = fileRecord.requestId
    ? uploadStatus[fileRecord.requestId]
    : null;
  const currentStatus = fileStatus?.status;
  const currentProgress = fileStatus?.progress || 0;
  const statusDisplayText = getStatusDisplayText(fileStatus?.status);

  // Auto-expand and scroll into view if errors appear
  useLayoutEffect(() => {
    if (isExpanded) {
      const el = document.getElementById("active-file-form" + fileRecord.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isExpanded, hasErrors]);

  return (
    <div
      className={`flex w-full flex-col gap-3 overflow-hidden rounded-lg border  bg-white p-3 ${
        fileRecord.isReferenceFound
          ? "border-slate-200"
          : "border-red-500 opacity-90"
      } ${showExpandButton ? "" : "border-green-400 shadow-md "}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex flex-shrink-0 items-center gap-2.5 rounded-md bg-neutral-100 p-[5px]">
            {fileRecord.type === "audio" ? (
              <Phone className="h-3.5 w-3.5 text-slate-600" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-slate-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {fileRecord.file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatFileSize(fileRecord.file.size)}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
          {!fileRecord.isReferenceFound && (
            <p className="hidden text-xs font-medium text-red-500 md:block lg:w-24">
              Reference not found in CRI Files
            </p>
          )}

          <div className="hidden rounded-md border border-slate-200 px-3 py-1 sm:block">
            <p className="text-sm font-medium text-neutral-500 capitalize">
              {fileRecord.type}
            </p>
          </div>

          {fileRecord.type === "audio" && fileRecord.duration && (
            <p className="hidden w-20 text-sm font-medium text-neutral-500 md:block lg:w-24">
              {fileRecord.duration || ""}
            </p>
          )}

          {fileRecord.requestId && currentProgress !== undefined && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          !currentStatus || currentStatus === "error"
                            ? 100
                            : currentProgress
                        }
                        className={`h-2 w-24 ${
                          !currentStatus || currentStatus.includes("FAILED")
                            ? "[&>div]:bg-red-500"
                            : currentStatus === "KEYWORD_DETECTION_COMPLETE" ||
                                currentStatus === "COMPLETED"
                              ? "[&>div]:bg-green-500"
                              : "[&>div]:bg-blue-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          !currentStatus || currentStatus === "error"
                            ? "text-red-500"
                            : currentStatus === "completed"
                              ? "text-green-500"
                              : "text-blue-500"
                        }`}
                      >
                        {statusDisplayText}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{statusDisplayText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {showExpandButton && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-auto p-1"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(fileRecord.id)}
                className="h-auto p-1 text-slate-600 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {!showExpandButton && (
            <CheckLine className="h-4 w-4 text-green-400" />
          )}
        </div>
      </div>
      <MetaDataForm
        closeDialog={() => setIsExpanded(false)}
        dialogOpen={isExpanded}
        fileType={fileRecord.file.type}
        handleMetadataChange={handleMetadataChange}
        metadata={fileRecord.metadata}
        setDialogOpen={setIsExpanded}
        showClose={false}
        errors={errors}
      />
    </div>
  );
};
