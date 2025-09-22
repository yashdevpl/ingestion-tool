import { useState } from "react";
import { Check, Loader2, RotateCcw, Upload, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useUploadStatus } from "../context/upload-status-context";
import { useFiltersContext } from "../context/filters-context";
import { cn } from "../lib/utils";

export function FileUploadStatus() {
  const { uploadStatus, clearAllStatus, setStopPolling, stopPolling } =
    useUploadStatus();
  const [hideAfterAllComplete, setHideAfterAllComplete] = useState(false);
  const { openUploadFile, setOpenUploadFile } = useFiltersContext();

  // Get all uploads
  const allUploads = Object.entries(uploadStatus);

  // Don't show component if no uploads or if hiding after all complete
  if (allUploads.length === 0 || hideAfterAllComplete) return null;

  const uploads = allUploads; // Show all uploads

  const anyInProgress = uploads.some(
    ([_, status]) =>
      !status.status.includes("FAILED") &&
      status.status !== "KEYWORD_DETECTION_COMPLETE" &&
      status.status !== "COMPLETED"
  );

  const completedCount = uploads.filter(
    ([_, status]) =>
      status.status === "KEYWORD_DETECTION_COMPLETE" ||
      status.status === "COMPLETED"
  ).length;

  const failedCount = uploads.filter(([_, status]) =>
    status.status.includes("FAILED")
  ).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative h-8 w-8 rounded-full",
            anyInProgress && "animate-pulse"
          )}
        >
          {anyInProgress ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : failedCount > 0 ? (
            <X className="h-4 w-4 text-red-500" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploads.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {uploads.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">File Uploads</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {completedCount > 0 && (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  {completedCount}
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1">
                  <X className="h-3 w-3 text-red-500" />
                  {failedCount}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto cursor-pointer px-2 text-xs"
                onClick={() => {
                  clearAllStatus();
                  if (!stopPolling) setStopPolling(true);
                  setHideAfterAllComplete(false); // Reset hide state when cleared
                }}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto cursor-pointer px-2 text-xs"
                onClick={() => {
                  if (!openUploadFile) setOpenUploadFile(true);
                }}
              >
                Show More
              </Button>
            </div>
          </div>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {uploads.map(([id, status]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-medium">
                      {status.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs whitespace-nowrap",
                        status.status.includes("FAILED") && "text-red-500",
                        (status.status === "KEYWORD_DETECTION_COMPLETE" ||
                          status.status === "COMPLETED") &&
                          "text-green-500",
                        status.status.includes("PROCESSING") && "text-blue-500"
                      )}
                    >
                      {status.status
                        .split("_")
                        .map(
                          (word) => word.charAt(0) + word.slice(1).toLowerCase()
                        )
                        .join(" ")}
                    </span>
                    {status.status.includes("FAILED") && !openUploadFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                        onClick={() =>
                          !openUploadFile && setOpenUploadFile(true)
                        }
                        title={`Retry ${status.fileName}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Progress
                  value={status.progress}
                  className={cn(
                    "h-1",
                    status.status.includes("FAILED") && "[&>div]:bg-red-500",
                    (status.status === "KEYWORD_DETECTION_COMPLETE" ||
                      status.status === "COMPLETED") &&
                      "[&>div]:bg-green-500"
                  )}
                />
                {status.error && (
                  <p className="text-xs text-red-500">{status.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
