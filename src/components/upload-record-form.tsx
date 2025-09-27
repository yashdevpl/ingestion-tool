import { ChevronDown, Filter, Search, Upload, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { useToast } from "../hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { useFilePolling } from "../hooks/use-file-polling";
import type { FileRecord } from "../types/common";
import { ElectronBridge } from "../types/electron-bridge";
import { Button } from "./ui/button";
import { FileItem } from "./upload-form/FileItems";
import { ReadingFilesDialog } from "./upload-form/ReadingFilesDialog";
import { VirtualizedFileList } from "./upload-form/VirtualizedFileList";

declare global {
  interface Window {
    electronAPI: ElectronBridge;
  }
}

interface PollingData {
  status: string;
  requestId?: string;
  trackingCode?: string;
  trackedNumber?: string;
}
// Main component
const UploadRecordForm: React.FC = () => {
  const [fileRecords, setFileRecords] = useState<FileRecord[]>([]);
  const [uploadedFilesList, setUploadedFilesList] = useState<FileRecord[]>([]);
  const [contextId, setContextId] = useState<number>(0);
  const [dirPath, setDirPath] = useState("");
  const [processingLoader, setProcessingLoader] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [fileValidationErrors, setFileValidationErrors] = useState<any[]>([]);
  const [expandedErrorItems, setExpandedErrorItems] = useState<Set<string>>(
    new Set()
  );
  const [uploadError, setUploadError] = useState<{
    message: string;
    apiType: "SMS" | "Call" | "System";
    failedCount: number;
    failedFiles?: any[]; // Store failed files for retry
  } | null>(null);

  // New state for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [readFilesData, setReadFilesData] = useState<{
    smsFiles: number;
    audioFiles: number;
    audioCriFiles: number;
    audioMetadataFiles: number;
    totalFiles: number;
    dirPath: string;
    validationErrors?: any[];
    totalErrors?: number;
  } | null>(null);

  const { toast } = useToast();
  const { data, loading, error, start, stop, isActive } = useFilePolling<
    FileRecord[]
  >({
    url: `http://localhost:3001/api/file-uploads`,
    interval: 4000,
  });
  // Simplified upload function with basic error handling
  const startUpload = async (files: FileRecord[]) => {
    console.log("startUpload called with files:", files);
    console.log("startUpload contextId:", contextId);

    setUploadError(null); // Clear previous errors

    // Setup progress listener
    window.electronAPI.onUploadProgress((progress) => {
      console.log("Upload progress:", progress);
    });

    try {
      console.log("Calling window.electronAPI.uploadFiles...");
      const result = await window.electronAPI.uploadFiles(files, contextId);
      console.log("Upload result received:", result);

      // Handle successful uploads
      if (result.successful.length > 0) {
        const successMsg = [];
        if (result.processedAudio > 0) {
          successMsg.push(`${result.processedAudio} audio files`);
        }
        if (result.processedSMS > 0) {
          successMsg.push(`${result.processedSMS} SMS files`);
        }

        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successMsg.join(" and ")}`,
        });
      }

      // Handle failed uploads with simplified error info
      if (result.failed.length > 0) {
        // Group failed files by API endpoint to determine which API actually failed
        const failedByApi = result.failed.reduce(
          (acc: Record<string, number>, failedFile: any) => {
            const apiType = failedFile.apiEndpoint || "unknown";
            acc[apiType] = (acc[apiType] || 0) + 1;
            return acc;
          },
          {}
        );

        // Determine the primary failing API (the one with more failures)
        const primaryFailingApi = Object.keys(failedByApi).reduce((a, b) =>
          failedByApi[a] > failedByApi[b] ? a : b
        );

        let apiType: "SMS" | "Call" | "System" = "System";
        if (primaryFailingApi === "call") {
          apiType = "Call";
        } else if (primaryFailingApi === "sms") {
          apiType = "SMS";
        }

        // Get the first error message as representative
        const firstError: any = result.failed[0];
        const errorMessage =
          firstError.error ||
          firstError.message ||
          "Upload failed with unknown error";

        setUploadError({
          message: errorMessage,
          apiType,
          failedCount: result.failed.length,
          failedFiles: result.failed, // Store failed files for retry
        });

        toast({
          title: "Upload Failed",
          description: `${result.failed.length} files failed to upload. ${apiType} API error detected.`,
          variant: "destructive",
        });
      }

      // Handle case where no files were processed
      if (result.successful.length === 0 && result.failed.length === 0) {
        toast({
          title: "No Files Processed",
          description:
            "No files were found to upload. Please check your file selection.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      setUploadError({
        message: error.message || "Upload process failed unexpectedly",
        apiType: "System",
        failedCount: files.length,
      });

      toast({
        title: "Upload Failed",
        description: "Upload process failed. System error detected.",
        variant: "destructive",
      });
    } finally {
      // Clean up listener
      window.electronAPI.removeUploadProgressListener();
      setProcessingLoader(false);
    }
  };

  // Retry function for failed uploads
  const retryFailedUploads = async () => {
    if (!uploadError?.failedFiles || uploadError.failedFiles.length === 0) {
      toast({
        title: "No files to retry",
        description: "No failed files available for retry.",
        variant: "destructive",
      });
      return;
    }

    // Clear the current error
    setUploadError(null);
    setProcessingLoader(true);

    try {
      // Find the original files that failed using fileId
      const failedFileIds = uploadError.failedFiles.map((f) => f.fileId);
      const filesToRetry = fileRecords.filter((file) =>
        failedFileIds.includes(file.id)
      );

      if (filesToRetry.length === 0) {
        toast({
          title: "Files not found",
          description:
            "Failed files are no longer available in the current session.",
          variant: "destructive",
        });
        setProcessingLoader(false);
        return;
      }

      toast({
        title: "Retrying upload",
        description: `Retrying upload for ${filesToRetry.length} file${filesToRetry.length > 1 ? "s" : ""}...`,
      });

      console.log("Retry: Starting upload for files:", filesToRetry);
      console.log("Retry: Context ID:", contextId);
      console.log("Retry: Failed file IDs:", failedFileIds);

      // Start polling like in the original upload flow
      start(`contextId=${contextId.toString()}`);

      // Use the same upload logic but only for failed files
      await startUpload(filesToRetry);
    } catch (error: any) {
      console.error("Retry upload error:", error);
      setUploadError({
        message: error?.message || "Retry failed with unknown error",
        apiType: "System",
        failedCount: uploadError.failedFiles?.length || 0,
        failedFiles: uploadError.failedFiles,
      });

      toast({
        title: "Retry failed",
        description:
          error?.message || "An unexpected error occurred during retry",
        variant: "destructive",
      });

      setProcessingLoader(false);
    }
  };

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = data || fileRecords;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((file) =>
        file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((file) => {
        switch (statusFilter) {
          case "completed":
            return file.isIngested;
          case "processing":
            return file.isUploaded && !file.isIngested;
          case "pending":
            return !file.isRead;
          case "error":
            return (
              validationErrors[file.id] &&
              Object.keys(validationErrors[file.id]).length > 0
            );
          default:
            return true;
        }
      });
    }

    // Apply sorting with null checks
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          // Compare fileName with null check
          comparison = (a.fileName || "").localeCompare(b.fileName || "");
          break;
        case "size":
          // Compare fileSize as numbers with null check
          const aSizeNum = parseInt(a.fileSize || "0", 10);
          const bSizeNum = parseInt(b.fileSize || "0", 10);
          comparison = aSizeNum - bSizeNum;
          break;
        case "date":
          // Compare uploadedAt dates with null check
          const aDate = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bDate = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    data,
    fileRecords,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    validationErrors,
  ]);

  const getStatusCounts = useMemo(() => {
    const files = data || fileRecords;
    return {
      total: files.length,
      completed: files.filter((f) => f.isIngested).length,
      processing: files.filter((f) => f.isUploaded && !f.isIngested).length,
      pending: files.filter((f) => !f.isRead).length,
      error: files.filter(
        (f) =>
          validationErrors[f.id] &&
          Object.keys(validationErrors[f.id]).length > 0
      ).length,
    };
  }, [data, fileRecords, validationErrors]);

  const handleFileInput = async () => {
    const path = await window.electronAPI.selectDirectory();
    setDirPath(path || "");
  };

  const startFileProcessing = async (path: string) => {
    const contextDetails = await window.electronAPI.createUploadContext();

    try {
      if (path && contextDetails?.id) {
        setContextId(contextDetails.id);
        setIsReadingFiles(true); // Show reading files dialog
        setDirPath(path);

        const fileList = await window.electronAPI.listFiles(
          path,
          contextDetails.id
        );

        // Process and display file summary
        if (fileList) {
          const summary = {
            smsFiles: fileList.smsFiles.length,
            audioFiles: fileList.audioFiles.length,
            audioCriFiles: fileList.audioCriFiles.length,
            audioMetadataFiles: fileList.audioMetadataFiles.length,
            totalFiles: fileList.validFiles.length,
            dirPath: path,
            validationErrors: fileList.validationErrors || [],
            totalErrors: (fileList.validationErrors || []).length,
          };

          // Set the file records for display
          setFileRecords(fileList.validFiles);

          // Store validation errors
          setFileValidationErrors(fileList.validationErrors || []);

          if (fileList.validFiles.length > 0) {
            setReadFilesData(summary);
          } else {
            toast({
              title: "No Valid Files",
              description: "No valid files found in the selected directory",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.log("File Processing Error:", error);
      stop();
      toast({
        title: "Error",
        description: "Failed to process files",
        variant: "destructive",
      });
    } finally {
      setIsReadingFiles(false);
      setProcessingLoader(false);
    }
  };

  const renderFileItem = useCallback(
    (fileRecord: FileRecord, index: number) => (
      <FileItem
        key={fileRecord.id}
        fileRecord={fileRecord}
        index={index}
        onDelete={(id) => void 0}
        onUpdateMetadata={() => void 0}
        errors={validationErrors[fileRecord.id]}
      />
    ),
    [validationErrors]
  );

  // Files Summary Dialog
  const FilesSummaryDialog = () => (
    <Dialog open={readFilesData !== null} onOpenChange={() => null}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Files Ready for Upload</DialogTitle>
          <DialogDescription>
            Found the following files in: {readFilesData?.dirPath}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* File Type Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">SMS Files</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.smsFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Audio Files</div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">
                  Audio CRI Files
                </div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioCriFiles}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">
                  Audio with Metadata
                </div>
                <div className="text-2xl font-semibold text-slate-900">
                  {readFilesData?.audioMetadataFiles}
                </div>
              </div>
            </div>

            {/* Total Files Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-blue-700 font-medium">
                    Total Valid Files
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Ready for upload
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-700">
                  {readFilesData?.totalFiles}
                </div>
              </div>
            </div>

            {/* Validation Errors Section */}
            {readFilesData?.totalErrors && readFilesData.totalErrors > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm text-red-700 font-medium">
                      Validation Errors
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Files with metadata issues (will be skipped)
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-700">
                    {readFilesData.totalErrors}
                  </div>
                </div>

                {/* Scrollable Error Details with Accordion */}
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg bg-white">
                  <Accordion type="multiple" className="w-full">
                    {readFilesData.validationErrors?.map((error, index) => (
                      <AccordionItem
                        key={index}
                        value={`error-${index}`}
                        className="border-b border-red-100 last:border-b-0"
                      >
                        <AccordionTrigger className="px-3 py-2.5 hover:bg-red-50 text-left [&[data-state=open]>svg]:rotate-180">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="text-red-500 text-sm">⚠️</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800">
                                {error.fileName}
                                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                  {error.fileType}
                                </span>
                                {error.criFileName && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                    CRI: {error.criFileName}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-red-600 mt-1">
                                {error.errors.length} error
                                {error.errors.length > 1 ? "s" : ""} found
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-2">
                            {error.errors.map(
                              (errorMsg: string, errorIndex: number) => (
                                <div
                                  key={errorIndex}
                                  className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs"
                                >
                                  <div className="text-red-500 mt-0.5 flex-shrink-0">
                                    •
                                  </div>
                                  <div className="text-red-700">{errorMsg}</div>
                                </div>
                              )
                            )}
                          </div>

                          {/* File info */}
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <div className="text-xs text-red-600">
                              <strong>File:</strong> {error.fileName}
                              <br />
                              <strong>Type:</strong>{" "}
                              {error.fileType === "audio"
                                ? "Audio Call"
                                : "SMS/Text"}
                              <br />
                              {error.criFileName && (
                                <>
                                  <strong>CRI File:</strong> {error.criFileName}
                                  <br />
                                </>
                              )}
                              <strong>Status:</strong>{" "}
                              <span className="text-red-700 font-medium">
                                Will be excluded from upload
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  💡 <strong>Tip:</strong> These files have validation errors
                  and will be automatically excluded from upload. You can still
                  upload the valid files, or fix the metadata issues and try
                  again later.
                </div>
              </div>
            )}

            {/* Estimated Time Calculation */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-700 font-medium">
                    Estimated Upload Time
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Based on file types and counts
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    {(() => {
                      // Average upload times in seconds per file
                      const SMS_UPLOAD_TIME = 1; // 1 second per SMS file
                      const AUDIO_UPLOAD_TIME = 5; // 5 seconds per audio file

                      const totalSeconds =
                        (readFilesData?.smsFiles || 0) * SMS_UPLOAD_TIME +
                        (readFilesData?.audioFiles || 0) * AUDIO_UPLOAD_TIME;

                      const minutes = Math.floor(totalSeconds / 60);
                      const seconds = totalSeconds % 60;

                      if (minutes > 0) {
                        return `~${minutes} min ${seconds} sec`;
                      } else {
                        return `~${seconds} seconds`;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {readFilesData?.totalFiles
                      ? `Processing ${readFilesData.totalFiles} files`
                      : "No files to process"}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning/Info Message */}
            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
              <div className="flex gap-2 items-start">
                <div className="text-amber-500 mt-0.5">⚠️</div>
                <div>
                  <div className="text-slate-700 font-medium mb-1">
                    Upload Information
                  </div>
                  <div>Upload time may vary based on:</div>
                  <ul className="list-disc ml-4 mt-1 text-xs space-y-1">
                    <li>Your internet connection speed</li>
                    <li>Server response time</li>
                    <li>File sizes and complexity</li>
                  </ul>
                  {readFilesData?.totalErrors &&
                    readFilesData.totalErrors > 0 && (
                      <div className="mt-2 text-red-600 font-medium">
                        ⚠️ {readFilesData.totalErrors} files excluded due to
                        validation errors
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="w-full space-y-4">
            {/* Status Summary */}
            <div className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-700 font-medium">
                    {readFilesData?.totalFiles || 0} valid files ready
                  </span>
                </div>
                {readFilesData?.totalErrors &&
                  readFilesData.totalErrors > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-slate-700 font-medium">
                        {readFilesData.totalErrors} files with errors (will be
                        skipped)
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReadFilesData(null);
                  toast({
                    title: "Upload Cancelled",
                    description:
                      "File selection cancelled. You can try again with a different directory.",
                    variant: "destructive",
                  });
                }}
              >
                Cancel
              </Button>

              {readFilesData?.totalFiles && readFilesData.totalFiles > 0 ? (
                <Button
                  type="button"
                  onClick={() => {
                    setReadFilesData(null);
                    setProcessingLoader(true);
                    start(`contextId=${contextId.toString()}`);
                    startUpload(fileRecords);
                    const validFilesCount = readFilesData?.totalFiles || 0;
                    const errorFilesCount = readFilesData?.totalErrors || 0;
                    toast({
                      title: "Upload Started",
                      description:
                        errorFilesCount > 0
                          ? `Uploading ${validFilesCount} valid files. ${errorFilesCount} files with validation errors will be skipped.`
                          : `Uploading ${validFilesCount} files. All files passed validation.`,
                    });
                  }}
                >
                  Upload Valid Files ({readFilesData.totalFiles})
                </Button>
              ) : (
                <Button type="button" variant="destructive" disabled>
                  No Valid Files to Upload
                </Button>
              )}
            </div>

            {/* Help Text */}
            {readFilesData?.totalErrors && readFilesData.totalErrors > 0 && (
              <div className="text-xs text-center text-slate-600 bg-blue-50 p-3 rounded border border-blue-200">
                💡 <strong>What happens next:</strong> Only valid files will be
                uploaded. Files with errors will remain in your directory and
                won't be processed. You can fix the metadata issues in those
                files and upload them later.
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Simple Upload Error Display
  const UploadErrorDisplay = () => {
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
                onClick={retryFailedUploads}
                disabled={processingLoader}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs rounded transition-colors flex items-center gap-1"
              >
                {processingLoader ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    Retrying...
                  </>
                ) : (
                  "Retry Failed Files"
                )}
              </button>
              <button
                onClick={() => setUploadError(null)}
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

  return (
    <div className="flex max-h-screen w-full flex-col overflow-hidden">
      <ReadingFilesDialog isOpen={isReadingFiles} dirPath={dirPath} />
      <FilesSummaryDialog
        readFilesData={readFilesData}
        onUpload={() => {
          setProcessingLoader(true);
          start(`contextId=${contextId.toString()}`);
          startUpload(fileRecords);
        }}
        processingLoader={processingLoader}
      />
      <UploadErrorDisplay
        uploadError={uploadError}
        onRetry={retryFailedUploads}
        onDismiss={() => setUploadError(null)}
        processingLoader={processingLoader}
      />
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border-2 border-dashed border-slate-200 bg-slate-100 p-3">
              <Upload className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Upload Files
              </h1>
              <p className="text-sm text-slate-500">
                Managing {(data || fileRecords).length.toLocaleString()} files
              </p>
            </div>
          </div>

          {/* Status Overview */}
          <div className="flex gap-4 text-sm">
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

      {/* File Input Section */}
      <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-slate-200">
        <div
          className={`flex items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="text-center">
            <div className="rounded-full bg-slate-100 p-3 mx-auto w-fit mb-3">
              <Upload className="h-6 w-6 text-slate-600" />
            </div>
            {dirPath ? (
              <div>
                <p className="text-sm text-slate-500 mb-2">
                  Selected directory:{" "}
                  <span className="font-medium">{dirPath}</span>
                </p>
                <button
                  onClick={() => {
                    handleFileInput();
                    setDirPath("");
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Change Directory
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Drag and drop files here, or{" "}
                  <button
                    onClick={handleFileInput}
                    className="text-blue-600 hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-slate-500">
                  Supports audio files, SMS threads, documents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {data && data.length > 0 && (
        <div className="flex-shrink-0 bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>

            <div className="text-sm text-slate-500">
              Showing {filteredAndSortedFiles.length.toLocaleString()} of{" "}
              {(data || fileRecords).length.toLocaleString()} files
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex gap-6">
                {/* Status Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-slate-200 rounded px-2 py-1 mr-2"
                  >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="date">Date</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="text-sm border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-hidden">
        {filteredAndSortedFiles.length > 0 ? (
          <VirtualizedFileList
            files={filteredAndSortedFiles}
            itemHeight={56}
            containerHeight={400}
            renderItem={renderFileItem}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Upload className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-medium">No files found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-semibold">
              {filteredAndSortedFiles.length.toLocaleString()}
            </span>{" "}
            files ready for processing
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={isSubmitting || processingLoader}
            >
              Reset Data
            </Button>
            <Button
              type="submit"
              disabled={!dirPath || processingLoader}
              onClick={(e) => {
                e.preventDefault();
                startFileProcessing(dirPath);
              }}
            >
              {isSubmitting ? "Uploading..." : "Submit All Files"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadRecordForm;
