import {
  CheckCircle,
  Eye,
  FileText,
  Upload,
  XCircle,
  Clock,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { ElectronBridge } from "../../types/electron-bridge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export type fileStatus =
  | "uploaded"
  | "ingested"
  | "failed"
  | "read"
  | "failed_read"
  | "failed_upload"
  | "failed_ingest"
  | "INITIALIZING"
  | "FILE_UPLOADED"
  | "FILE_UPLOAD_FAILED"
  | "PROCESSING_STARTED"
  | "PROCESSING_COMPLETE"
  | "KEYWORD_DETECTION_STARTED"
  | "KEYWORD_DETECTION_COMPLETE"
  | "KEYWORD_DETECTION_FAILED"
  | "PROCESSING_FAILED"
  | "POLLING_ERROR";

interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: fileStatus | string;
  fileType: string;
  errorMessage?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronBridge;
  }
}

interface CompactFileItemProps {
  file: FileStatusItem;
  dirPath: string;
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "INITIALIZING":
      return "bg-gray-50 text-gray-700 border-gray-200";
    case "uploaded":
    case "FILE_UPLOADED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "FILE_UPLOAD_FAILED":
    case "failed_upload":
      return "bg-red-50 text-red-700 border-red-200";
    case "PROCESSING_STARTED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "ingested":
    case "PROCESSING_COMPLETE":
      return "bg-green-50 text-green-700 border-green-200";
    case "KEYWORD_DETECTION_STARTED":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "KEYWORD_DETECTION_COMPLETE":
      return "bg-green-50 text-green-700 border-green-200";
    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200";
    case "KEYWORD_DETECTION_FAILED":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "PROCESSING_FAILED":
    case "failed_ingest":
      return "bg-red-50 text-red-700 border-red-200";
    case "POLLING_ERROR":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "read":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "failed":
    case "failed_read":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export const getStatusLabel = (status: string) => {
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
    case "COMPLETED":
      return "Analysis Complete";
    case "KEYWORD_DETECTION_FAILED":
      return "Analysis Failed";
    case "PROCESSING_FAILED":
      return "Processing Failed";
    case "POLLING_ERROR":
      return "Status Check Failed";
    case "failed_read":
      return "Read Failed";
    case "failed_upload":
      return "Upload Failed";
    case "failed_ingest":
      return "Ingest Failed";
    default:
      return status;
  }
};
export const getStatusIcon = (status: string) => {
  switch (status) {
    case "INITIALIZING":
      return <Clock className="h-3 w-3 text-gray-500" />;
    case "uploaded":
    case "FILE_UPLOADED":
      return <Upload className="h-3 w-3 text-blue-500" />;
    case "FILE_UPLOAD_FAILED":
    case "failed_upload":
      return <XCircle className="h-3 w-3 text-red-500" />;
    case "PROCESSING_STARTED":
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
    case "ingested":
    case "PROCESSING_COMPLETE":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "KEYWORD_DETECTION_STARTED":
      return <Search className="h-3 w-3 text-purple-500 animate-pulse" />;
    case "KEYWORD_DETECTION_COMPLETE":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "COMPLETED":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "KEYWORD_DETECTION_FAILED":
      return <XCircle className="h-3 w-3 text-orange-500" />;
    case "PROCESSING_FAILED":
    case "failed_ingest":
      return <XCircle className="h-3 w-3 text-red-500" />;
    case "POLLING_ERROR":
      return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    case "read":
      return <Eye className="h-3 w-3 text-purple-500" />;
    case "failed":
    case "failed_read":
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <FileText className="h-3 w-3 text-gray-500" />;
  }
};

export const CompactFileItem: React.FC<CompactFileItemProps> = ({
  file,
  dirPath,
}) => {
  const [retryLoading, setRetryLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [uploadReady, setUploadReady] = useState<any>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const isError =
    file.status.includes("failed") ||
    file.status.includes("FAILED") ||
    file.status === "POLLING_ERROR" ||
    file.errorMessage?.includes("failed");

  const handleFileRetry = async () => {
    setRetryLoading(true);
    try {
      const reuploadData = await window.electronAPI.reUploadFile(
        file.id,
        file.fileName,
        file.status,
        dirPath
      );

      setValidationErrors(reuploadData.validationErrors || []);
      setUploadReady(reuploadData.uploadFile || null);
      setDialogOpen(true);
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetryLoading(false);
    }
  };

  const handleUploadStart = async () => {
    // You can call actual upload API here
    alert(`Uploading file: ${uploadReady?.name}`);
    setDialogOpen(false);
  };

  return (
    <>
      <div
        className={`flex items-center justify-between p-2 border rounded-lg transition-colors ${
          isError
            ? "border-red-200 bg-red-50/30"
            : "border-gray-100 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getStatusIcon(file.status)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-900">
              {file.fileName}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formatFileSize(file.fileSize)}</span>
              <span>•</span>
              <span className="capitalize">{file.fileType}</span>
              {file.uploadDate && (
                <>
                  <span>•</span>
                  <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
            {file.errorMessage && (
              <p className="text-xs text-red-600 mt-0.5 truncate">
                {file.errorMessage}
              </p>
            )}
          </div>
        </div>
        {isError && (
          <Button size="sm" onClick={handleFileRetry} disabled={retryLoading}>
            {retryLoading ? "Retrying..." : "Retry"}
          </Button>
        )}
        <Badge
          variant="outline"
          className={`text-xs px-2 py-0.5 capitalize whitespace-nowrap ${getStatusColor(
            file.status
          )}`}
        >
          {getStatusLabel(file.status)}
        </Badge>
      </div>

      {/* Retry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>File: {file.fileName}</DialogTitle>
            <DialogDescription>Located in: {dirPath}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Validation Errors */}
            {validationErrors.length > 0 ? (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-red-500 text-lg">⚠️</div>
                  <div className="text-red-800 font-semibold">
                    Validation Errors Found
                  </div>
                  <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {validationErrors.length} file
                    {validationErrors.length > 1 ? "s" : ""} affected
                  </div>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {validationErrors.map((err, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`error-${idx}`}
                      className="border border-red-200 rounded-lg bg-white"
                    >
                      <AccordionTrigger className="px-3 py-2 hover:no-underline">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-red-700 font-medium truncate">
                              {err.fileName}
                            </span>
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                              {err.fileType}
                            </span>
                            {err.criFileName && (
                              <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                CRI: {err.criFileName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            {err.errors.length} error
                            {err.errors.length > 1 ? "s" : ""} found
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-2">
                          {err.errors.map((errorMsg: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs"
                            >
                              <div className="text-red-500 mt-0.5 flex-shrink-0">
                                •
                              </div>
                              <div className="text-red-700">{errorMsg}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-600">
                          <strong>File:</strong> {err.fileName}
                          <br />
                          <strong>Type:</strong>{" "}
                          {err.fileType === "audio" ? "Audio Call" : "SMS/Text"}
                          <br />
                          {err.criFileName && (
                            <>
                              <strong>CRI File:</strong> {err.criFileName}
                              <br />
                            </>
                          )}
                          <strong>Status:</strong>{" "}
                          <span className="text-red-700 font-medium">
                            Will be excluded from upload
                          </span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  💡 <strong>Tip:</strong> These files have validation errors
                  and will be automatically excluded from upload. You can fix
                  them and retry later.
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No validation errors found. You can start the upload.
              </p>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-center gap-4 w-full">
              {validationErrors.length === 0 ? (
                <Button
                  onClick={handleUploadStart}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                >
                  Start Upload
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
