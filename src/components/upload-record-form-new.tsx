import { Upload } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useFilePolling } from "../hooks/use-file-polling";
import { useToast } from "../hooks/use-toast";
import type { FileRecord } from "../types/common";
import { ElectronBridge } from "../types/electron-bridge";
import { CompactUploadProgress } from "./upload-form/CompactUploadProgress";
import { EmptyFilesList } from "./upload-form/EmptyFilesList";
import { FileInputSection } from "./upload-form/FileInputSection";
import { FileItem } from "./upload-form/FileItems";
import { FilesSummaryDialog } from "./upload-form/FilesSummaryDialog";
import { FileStatusTabs } from "./upload-form/FileStatusTabs";
import { FiltersAndSearch } from "./upload-form/FiltersAndSearch";
import { ReadingFilesDialog } from "./upload-form/ReadingFilesDialog";
import { UploadErrorDisplay } from "./upload-form/UploadErrorDisplay";
import { UploadFooter } from "./upload-form/UploadFooter";
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

interface ReadFilesData {
  dirPath: string;
  smsFiles: number;
  audioFiles: number;
  audioCriFiles: number;
  audioMetadataFiles: number;
  totalFiles: number;
  totalErrors: number;
  errors?: Array<{
    fileName: string;
    fileType: string;
    criFileName?: string;
    errors: string[];
  }>;
}

interface UploadError {
  message: string;
  apiType: "SMS" | "Call" | "System";
  failedCount: number;
  failedFiles?: any[];
}

// Main component
const UploadRecordForm: React.FC = () => {
  const [fileRecords, setFileRecords] = useState<FileRecord[]>([]);
  const [contextId, setContextId] = useState<number>(0);
  const [dirPath, setDirPath] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [processingLoader, setProcessingLoader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const [uploadError, setUploadError] = useState<UploadError | null>(null);

  // New state for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [readFilesData, setReadFilesData] = useState<ReadFilesData | null>(
    null
  );

  // New state for UI mode and upload tracking
  const [uiMode, setUiMode] = useState<"selection" | "uploading" | "status">(
    "selection"
  );
  const [uploadStarted, setUploadStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    uploaded: 0,
    ingested: 0,
    failed: 0,
  });

  const { toast } = useToast();

  const { data, loading, error, start, stop, isActive } = useFilePolling<{
    data: FileRecord[];
    totalCount?: number;
    uploadedCount?: number;
    ingestedCount?: number;
  }>({
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

    // Switch back to uploading mode for retry
    setUiMode("uploading");

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
    // Ensure we always have an array to work with
    const sourceData = data?.data && Array.isArray(data.data) ? data.data : [];
    const fallbackData = Array.isArray(fileRecords) ? fileRecords : [];
    let filtered = sourceData.length > 0 ? sourceData : fallbackData;

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

    // Ensure filtered is an array before sorting
    if (!Array.isArray(filtered)) {
      return [];
    }

    // Apply sorting
    return filtered?.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.fileName;
          bValue = b.fileName;
          break;
        case "size":
          aValue = parseInt(a.fileSize);
          bValue = parseInt(b.fileSize);
          break;
        case "type":
          aValue = a.fileType;
          bValue = b.fileType;
          break;
        case "status":
          aValue = a.isIngested
            ? "completed"
            : a.isUploaded
              ? "processing"
              : "pending";
          bValue = b.isIngested
            ? "completed"
            : b.isUploaded
              ? "processing"
              : "pending";
          break;
        default:
          return 0;
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : 1;
      }
      return aValue < bValue ? -1 : 1;
    });
  }, [
    data,
    fileRecords,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    validationErrors,
  ]);

  const startFileProcessing = async (path: string) => {
    setIsReadingFiles(true);
    setUploadError(null); // Clear any previous errors

    try {
      // Create upload context first
      console.log("Creating upload context...");
      const context = await window.electronAPI.createUploadContext();
      setContextId(context.id);
      console.log("Upload context created:", context.id);

      // List and process files
      console.log("Starting file processing for path:", path);
      const result = await window.electronAPI.listFiles(path, context.id);
      console.log("File processing result:", result);

      // Check if the result indicates an error or empty result
      if (!result) {
        throw new Error(
          "No response received from file processing. The worker may have crashed or the API might be down."
        );
      }

      // Check for system errors returned by the worker
      if (result.error) {
        throw new Error(result.error);
      }

      // Check if there are any valid files or if processing completely failed
      if (!result.validFiles && !result.allFiles) {
        throw new Error(
          "File processing failed completely. No files were found or processed."
        );
      }

      // Set file records
      const validFiles = result.validFiles || [];
      const allFiles = result.allFiles || [];
      setFileRecords(validFiles);
      console.log("Valid files found:", validFiles.length);
      console.log("Total files processed:", allFiles.length);

      if (result.validationErrors) {
        // Transform validation errors to the expected format
        const transformedErrors: Record<string, Record<string, string>> = {};
        result.validationErrors.forEach((error, index) => {
          transformedErrors[`error_${index}`] = {
            fileName: error.fileName,
            errors: error.errors.join(", "),
          };
        });
        setValidationErrors(transformedErrors);
      }

      // Calculate totals and errors
      const totalErrors = result.validationErrors?.length || 0;
      const totalFiles = validFiles.length;
      const totalProcessed = allFiles.length;

      // Set read files data for dialog
      setReadFilesData({
        smsFiles: result.smsFiles?.length || 0,
        audioFiles: result.audioFiles?.length || 0,
        audioCriFiles: result.audioCriFiles?.length || 0,
        audioMetadataFiles: result.audioMetadataFiles?.length || 0,
        totalFiles: totalFiles,
        dirPath: path,
        totalErrors: totalErrors,
        errors:
          result.validationErrors?.map((err) => ({
            fileName: err.fileName,
            fileType: err.fileType,
            criFileName: err.criFileName,
            errors: err.errors,
          })) || [],
      });

      console.log("Setting readFilesData:", {
        smsFiles: result.smsFiles?.length || 0,
        audioFiles: result.audioFiles?.length || 0,
        audioCriFiles: result.audioCriFiles?.length || 0,
        audioMetadataFiles: result.audioMetadataFiles?.length || 0,
        totalFiles: totalFiles,
        totalErrors: totalErrors,
        totalProcessed: totalProcessed,
      });

      // Show appropriate toast message based on results
      if (totalFiles > 0) {
        toast({
          title: "Files processed successfully",
          description: `Found ${totalFiles} valid files out of ${totalProcessed} processed${totalErrors ? ` (${totalErrors} files with validation errors)` : ""}`,
        });
      } else if (totalProcessed > 0) {
        toast({
          title: "Files processed with issues",
          description: `Processed ${totalProcessed} files, but none passed validation. Check the error details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "No files found",
          description:
            "No supported files were found in the selected directory.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("File processing error:", error);

      // Determine the type of error and show appropriate message
      let errorTitle = "Processing failed";
      let errorDescription =
        "An unexpected error occurred while processing files.";

      if (error?.message) {
        if (
          error.message.includes("worker") ||
          error.message.includes("crashed")
        ) {
          errorTitle = "Worker Process Error";
          errorDescription =
            "The file processing worker encountered an error. This might be due to corrupted files or system resource issues.";
        } else if (
          error.message.includes("API") ||
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorTitle = "API Connection Error";
          errorDescription =
            "Failed to connect to the server. Please check if the server is running and try again.";
        } else if (error.message.includes("context")) {
          errorTitle = "Context Creation Error";
          errorDescription =
            "Failed to create upload context. The server may be unavailable.";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("access")
        ) {
          errorTitle = "File Access Error";
          errorDescription =
            "Unable to access the selected directory or files. Please check file permissions.";
        } else {
          errorDescription = error.message;
        }
      }

      // Set upload error for display in the error component
      setUploadError({
        message: errorDescription,
        apiType: "System",
        failedCount: 1,
        failedFiles: [],
      });

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      // Reset states on error
      setReadFilesData(null);
      setFileRecords([]);
      setValidationErrors({});
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

  const handleFileInput = async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        setDirPath(result);
        await startFileProcessing(result);
      }
    } catch (error) {
      console.error("Directory selection failed:", error);
    }
  };

  const handleDirectoryChange = () => {
    handleFileInput();
    setDirPath("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSubmitAllFiles = () => {
    startFileProcessing(dirPath);
  };

  const handleUploadFromDialog = () => {
    setReadFilesData(null);
    setProcessingLoader(true);

    // Switch to uploading mode
    setUiMode("uploading");
    setUploadStarted(true);

    // Initialize upload stats
    const validFilesCount = readFilesData?.totalFiles || 0;
    setUploadStats({
      total: validFilesCount,
      uploaded: 0,
      ingested: 0,
      failed: 0,
    });

    start(`contextId=${contextId.toString()}`);
    startUpload(fileRecords);
    const errorFilesCount = readFilesData?.totalErrors || 0;
    toast({
      title: "Upload Started",
      description:
        errorFilesCount > 0
          ? `Uploading ${validFilesCount} valid files. ${errorFilesCount} files with validation errors will be skipped.`
          : `Uploading ${validFilesCount} files. All files passed validation.`,
    });
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
    setProcessingComplete(false);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setProcessingComplete(true);
  };

  // Handlers for UI mode switching
  const handleBackToUpload = () => {
    setUiMode("selection");
    setUploadStarted(false);
    setIsProcessing(false);
    setProcessingComplete(false);
    // Reset states
    setFileRecords([]);
    setDirPath("");
    setValidationErrors({});
    setUploadError(null);
    setUploadStats({ total: 0, uploaded: 0, ingested: 0, failed: 0 });
    stop();
  };

  const handleViewStatusDetails = () => {
    setUiMode("status");
  };

  const handleCancelUpload = () => {
    stop();
    setProcessingLoader(false);
    setUiMode("selection");
    setUploadStarted(false);
    toast({
      title: "Upload Cancelled",
      description: "File upload has been cancelled.",
      variant: "destructive",
    });
  };

  // Update upload stats based on polling data
  useEffect(() => {
    if (data?.data && uploadStarted) {
      // Count files by their upload and ingestion status
      const uploadedCount = data.data.filter(
        (file: FileRecord) => file.isUploaded
      ).length;
      const ingestedCount = data.data.filter(
        (file: FileRecord) => file.isIngested
      ).length;
      // For failed files, we'll need to track this separately as it's not in the FileRecord interface
      // This might come from uploadError state instead
      const failedCount = uploadError?.failedCount || 0;

      setUploadStats((prev) => ({
        ...prev,
        uploaded: uploadedCount,
        ingested: ingestedCount,
        failed: failedCount,
      }));

      // Switch to status view when upload completes or has errors
      if (
        (uploadedCount + failedCount >= uploadStats.total && !loading) ||
        uploadError
      ) {
        setProcessingLoader(false);
        if (uploadedCount > 0 || failedCount > 0) {
          setUiMode("status");
        }
      }
    }
  }, [data, loading, uploadStarted, uploadStats.total, uploadError]);

  return (
    <div className="flex max-h-screen w-full flex-col overflow-hidden">
      {/* Always show these dialogs */}
      <ReadingFilesDialog isOpen={isReadingFiles} dirPath={dirPath} />

      <FilesSummaryDialog
        readFilesData={readFilesData}
        onUpload={handleUploadFromDialog}
        processingLoader={processingLoader}
      />

      <UploadErrorDisplay
        uploadError={uploadError}
        onRetry={retryFailedUploads}
        onDismiss={() => setUploadError(null)}
        processingLoader={processingLoader}
      />

      {/* Conditional UI based on mode */}
      {uiMode === "selection" && (
        <>
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
                    Managing{" "}
                    {(data?.data || fileRecords || []).length.toLocaleString()}{" "}
                    files
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* File Input Section */}
          <FileInputSection
            dirPath={dirPath}
            dragOver={dragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileInput={handleFileInput}
            onDirectoryChange={handleDirectoryChange}
          />

          {/* Filters and Search */}
          <FiltersAndSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            hasData={(data?.data && data.data.length > 0) || false}
          />

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
              <EmptyFilesList />
            )}
          </div>

          {/* Fixed Footer */}
          <UploadFooter
            files={filteredAndSortedFiles}
            dirPath={dirPath}
            isSubmitting={isSubmitting}
            processingLoader={processingLoader}
            onReset={() => {
              setFileRecords([]);
              setDirPath("");
              setValidationErrors({});
              setUploadError(null);
              toast({
                title: "Data reset",
                description: "All data has been cleared.",
              });
            }}
            onSubmit={handleSubmitAllFiles}
          />
        </>
      )}

      {uiMode === "uploading" && (
        <div className="flex flex-col h-full">
          {/* Compact Upload Progress */}
          <div className="p-4">
            <CompactUploadProgress
              totalFiles={uploadStats.total}
              uploadedFiles={uploadStats.uploaded}
              ingestedFiles={uploadStats.ingested}
              failedFiles={uploadStats.failed}
              isUploading={processingLoader}
              isProcessing={isProcessing}
              processingComplete={processingComplete}
              onCancel={handleCancelUpload}
              onViewDetails={handleViewStatusDetails}
            />
          </div>

          {/* Show minimal file list during upload */}
          <div className="flex-1 p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Uploading Files...
              </h3>
              <p className="text-sm text-gray-600">
                {uploadStats.uploaded} of {uploadStats.total} files uploaded
                {uploadStats.failed > 0 && (
                  <span className="text-red-600 ml-2">
                    • {uploadStats.failed} failed
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {uiMode === "status" && (
        <FileStatusTabs
          contextId={contextId}
          onBack={handleBackToUpload}
          onProcessingStart={handleProcessingStart}
          onProcessingComplete={handleProcessingComplete}
        />
      )}
    </div>
  );
};

export default UploadRecordForm;
