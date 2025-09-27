import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { CompactFileItem } from "./CompactFileItem";
import { ApiStatusIndicator } from "./ApiStatusIndicator";
import { IngestionProgressItem } from "./IngestionProgressItem";
import { FileRecord } from "../../types/common";
import { useIngestionPolling } from "../../hooks/use-ingestion-polling";

interface ApiResponse {
  data: FileRecord[];
  totalCount: number;
  uploadedCount: number;
  readCount: number;
  ingestedCount: number;
}

interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: "uploaded" | "ingested" | "failed";
  fileType: string;
  errorMessage?: string;
}

interface FileStatusTabsProps {
  contextId?: number;
  onBack: () => void;
  onProcessingStart?: () => void;
  onProcessingComplete?: () => void;
}

export const FileStatusTabs: React.FC<FileStatusTabsProps> = ({
  contextId,
  onBack,
  onProcessingStart,
  onProcessingComplete,
}) => {
  const [activeTab, setActiveTab] = useState("uploaded");
  const [apiData, setApiData] = useState<Record<string, ApiResponse | null>>({
    uploaded: null,
    ingested: null,
    total: null,
    progress: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    uploaded: false,
    ingested: false,
    total: false,
    progress: false,
  });
  const [error, setError] = useState<Record<string, string | null>>({
    uploaded: null,
    ingested: null,
    total: null,
    progress: null,
  });
  const [tabCounts, setTabCounts] = useState({
    uploaded: 0,
    ingested: 0,
    total: 0,
    progress: 0,
  });
  const [pagination, setPagination] = useState<
    Record<string, { skip: number; take: number; currentPage: number }>
  >({
    uploaded: { skip: 0, take: 2, currentPage: 1 },
    ingested: { skip: 0, take: 2, currentPage: 1 },
    total: { skip: 0, take: 2, currentPage: 1 },
    progress: { skip: 0, take: 2, currentPage: 1 },
  });
  const [showIngestionProgress, setShowIngestionProgress] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<
    (FileRecord & { processingStatus?: any })[]
  >([]);
  const [trackedFileIds, setTrackedFileIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({
    uploaded: false,
    ingested: false,
    total: false,
    progress: false,
  });
  const [globalCompletedFiles, setGlobalCompletedFiles] = useState<Set<string>>(
    new Set()
  );
  const [initialCountsLoaded, setInitialCountsLoaded] = useState(false);
  const [processingDisplayCount, setProcessingDisplayCount] = useState(2); // Show 20 files initially
  const [processingLoading, setProcessingLoading] = useState(false);

  // Prepare files for ingestion polling - include upload and ingestion status - memoized for performance
  const allFilesWithStatus = useMemo(() => {
    const allUploadedFiles = apiData.uploaded?.data || [];
    const allIngestedFiles = apiData.ingested?.data || [];
    const allTotalFiles = apiData.total?.data || [];

    // Combine all files and mark their status
    return allTotalFiles.map((file) => {
      const isUploaded = allUploadedFiles.some((f) => f.id === file.id);
      const isIngested = allIngestedFiles.some((f) => f.id === file.id);
      return {
        ...file,
        isUploaded: isUploaded || file.isUploaded,
        isIngested: isIngested || file.isIngested,
      };
    });
  }, [apiData.uploaded?.data, apiData.ingested?.data, apiData.total?.data]);

  // Get ALL files ready for polling (not just visible ones) but exclude globally completed files
  const filesForPolling = useMemo(() => {
    const allReadyFiles = allFilesWithStatus
      .filter(
        (file) =>
          file.isUploaded &&
          file.isIngested &&
          file.context?.requestId &&
          !globalCompletedFiles.has(file.id.toString()) // Exclude globally completed files
      )
      .map((file) => ({
        id: file.id.toString(),
        fileType: file.fileType || file.type || "unknown",
        isUploaded: file.isUploaded,
        isIngested: file.isIngested,
        context: {
          requestId: file.context?.requestId,
        },
      }));

    console.log(
      `Files for polling: ${allReadyFiles.length}, Completed: ${globalCompletedFiles.size}`
    );
    return allReadyFiles;
  }, [allFilesWithStatus, globalCompletedFiles]);

  // Handle file status changes from polling - track globally completed files
  const handleFileStatusChange = useCallback(
    (fileId: string, status: any) => {
      // If file is completed, add it to global completed set
      if (status.isComplete || status.isFailed) {
        setGlobalCompletedFiles((prev) => new Set([...prev, fileId]));
        console.log(`File ${fileId} completed with status: ${status.status}`);
      }

      // Update the processed files list
      setProcessedFiles((prev) => {
        const existingIndex = prev.findIndex((f) => f.id.toString() === fileId);

        if (existingIndex >= 0) {
          const newFiles = [...prev];
          newFiles[existingIndex] = {
            ...newFiles[existingIndex],
            processingStatus: status,
          };
          return newFiles;
        }

        // If file not in processed files, try to find it in all files and add it
        const fileData = allFilesWithStatus.find(
          (f) => f.id.toString() === fileId
        );

        if (fileData) {
          return [
            ...prev,
            {
              ...fileData,
              processingStatus: status,
            },
          ];
        }

        return prev;
      });
    },
    [allFilesWithStatus]
  );

  // Start ingestion polling - always enabled if there are files ready
  const { statusMap, isPolling, allComplete, activePollingCount } =
    useIngestionPolling({
      files: filesForPolling,
      baseUrl: "http://localhost:3001",
      isEnabled: true, // Always enabled - hook handles individual file logic
      pollingInterval: 3000, // 3 seconds
      onFileStatusChange: handleFileStatusChange,
    });

  // Show ingestion progress when we have files ready for processing
  useEffect(() => {
    if (filesForPolling.length > 0 && !showIngestionProgress) {
      console.log("Files ready for processing, showing progress tab...");
      setShowIngestionProgress(true);
      // Auto-switch to progress tab if we have new files
      if (activePollingCount > 0) {
        setActiveTab("progress");
      }
      // Notify parent that processing started
      onProcessingStart?.();
    }
  }, [
    filesForPolling.length,
    showIngestionProgress,
    activePollingCount,
    onProcessingStart,
  ]);

  // Effect to notify when all processing is complete
  useEffect(() => {
    if (allComplete && activePollingCount === 0 && showIngestionProgress) {
      console.log("All ingestion processing complete!");
      onProcessingComplete?.();
    }
  }, [
    allComplete,
    activePollingCount,
    showIngestionProgress,
    onProcessingComplete,
  ]);

  // Update processed files when we have new files ready for processing from any tab
  useEffect(() => {
    // Use allFilesWithStatus instead of just current tab data
    const newFiles = allFilesWithStatus.filter(
      (file) => file.isUploaded && file.isIngested && file.context?.requestId
    );

    setProcessedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const filesToAdd = newFiles.filter((f) => !existingIds.has(f.id));
      return [...prev, ...filesToAdd];
    });
  }, [allFilesWithStatus]);

  // Handle load more for processing tab
  const handleLoadMoreProcessing = useCallback(() => {
    setProcessingLoading(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setProcessingDisplayCount((prev) => prev + 2);
      setProcessingLoading(false);
    }, 300);
  }, []);

  // Get visible processed files based on display count
  const visibleProcessedFiles = useMemo(() => {
    return processedFiles.slice(0, processingDisplayCount);
  }, [processedFiles, processingDisplayCount]);

  // Check if there are more files to load in processing tab
  const hasMoreProcessingFiles = processedFiles.length > processingDisplayCount;

  // Fetch initial counts for all tabs without loading full data
  const fetchInitialCounts = useCallback(async () => {
    if (!contextId || initialCountsLoaded) return;

    try {
      // Fetch just the first item with take=1 to get counts
      const params = new URLSearchParams({
        contextId: contextId.toString(),
        skip: "0",
        take: "1",
      });

      const response = await fetch(
        `http://localhost:3001/api/file-uploads?${params}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch initial counts: ${response.statusText}`
        );
      }

      const apiResponse: ApiResponse = await response.json();

      // Update tab counts from the API response
      setTabCounts({
        uploaded: apiResponse.uploadedCount,
        ingested: apiResponse.ingestedCount,
        total: apiResponse.totalCount,
        progress: 0, // Progress count is based on polling status
      });

      setInitialCountsLoaded(true);
      console.log("Initial counts loaded:", {
        uploaded: apiResponse.uploadedCount,
        ingested: apiResponse.ingestedCount,
        total: apiResponse.totalCount,
      });
    } catch (error) {
      console.error("Error fetching initial counts:", error);
    }
  }, [contextId, initialCountsLoaded]);

  // Fetch files based on tab using actual API
  const fetchFiles = useCallback(
    async (tab: string, loadMore = false) => {
      if (!contextId) return;

      // Progress tab doesn't need API fetching - it uses local polling data
      if (tab === "progress") return;

      setLoading((prev) => ({ ...prev, [tab]: true }));
      setError((prev) => ({ ...prev, [tab]: null }));

      try {
        const currentPagination = pagination[tab];
        const skip = loadMore
          ? currentPagination.skip + currentPagination.take
          : 0;

        // Build query parameters based on tab
        const params = new URLSearchParams({
          contextId: contextId.toString(),
          skip: skip.toString(),
          take: currentPagination.take.toString(),
        });

        // Add specific filters based on tab
        switch (tab) {
          case "uploaded":
            params.append("isUploaded", "true");
            break;
          case "ingested":
            params.append("isIngested", "true");
            break;
          case "total":
            // No additional filters for total - get all files for this context
            break;
        }

        const response = await fetch(
          `http://localhost:3001/api/file-uploads?${params}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${tab} files: ${response.statusText}`
          );
        }

        const apiResponse: ApiResponse = await response.json();

        // Check if there are more pages available
        const hasMoreData = apiResponse.data.length === currentPagination.take;
        setHasMore((prev) => ({ ...prev, [tab]: hasMoreData }));

        // Update the data and counts
        setApiData((prev) => ({
          ...prev,
          [tab]:
            loadMore && prev[tab]
              ? {
                  ...apiResponse,
                  data: [...prev[tab]!.data, ...apiResponse.data],
                }
              : apiResponse,
        }));

        // Update pagination
        if (loadMore) {
          setPagination((prev) => ({
            ...prev,
            [tab]: {
              ...prev[tab],
              skip,
              currentPage: prev[tab].currentPage + 1,
            },
          }));
        } else {
          setPagination((prev) => ({
            ...prev,
            [tab]: {
              ...prev[tab],
              skip: 0,
              currentPage: 1,
            },
          }));
        }

        // Update tab counts from the API response (these should be consistent across calls)
        setTabCounts((prev) => ({
          ...prev,
          uploaded: apiResponse.uploadedCount,
          ingested: apiResponse.ingestedCount,
          total: apiResponse.totalCount,
        }));
      } catch (error) {
        console.error(`Error fetching ${tab} files:`, error);
        setError((prev) => ({
          ...prev,
          [tab]:
            error instanceof Error ? error.message : "Failed to fetch files",
        }));
        setHasMore((prev) => ({ ...prev, [tab]: false }));
      } finally {
        setLoading((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [contextId, pagination]
  );

  // Convert FileRecord to FileStatusItem for display
  const convertToFileStatusItems = (
    files: FileRecord[],
    tabType: string
  ): FileStatusItem[] => {
    return files.map((file) => ({
      id: file.id.toString(),
      fileName: file.fileName,
      fileSize: parseInt(file.fileSize),
      uploadDate: file.uploadedAt,
      ingestionDate: file.isIngested ? file.uploadedAt : undefined, // You may need to add ingestionDate field
      status: file.isIngested
        ? "ingested"
        : file.isUploaded
          ? "uploaded"
          : "failed",
      fileType: file.fileType,
      errorMessage:
        !file.isUploaded && !file.isIngested ? "Upload failed" : undefined,
    }));
  };

  // Fetch initial counts on component mount
  useEffect(() => {
    fetchInitialCounts();
  }, [fetchInitialCounts]);

  // Fetch data when tab changes (only if not already loaded)
  useEffect(() => {
    if (!apiData[activeTab] && activeTab !== "progress") {
      fetchFiles(activeTab);
    }
  }, [activeTab, contextId, fetchFiles, apiData]);

  // Refresh function
  const handleRefresh = () => {
    if (activeTab !== "progress") {
      fetchFiles(activeTab);
    }
  };

  const renderFileList = (tab: string) => {
    const isLoading = loading[tab];
    const apiResponse = apiData[tab];
    const errorMsg = error[tab];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading files...</span>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600 text-center mb-4">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFiles(tab)}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    if (!apiResponse || apiResponse.data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No files found</p>
          </div>
        </div>
      );
    }

    const files = convertToFileStatusItems(apiResponse.data, tab);
    const currentHasMore = hasMore[tab];
    const currentPage = pagination[tab]?.currentPage || 1;
    const totalLoaded = apiResponse.data.length;

    return (
      <ScrollArea className="h-[450px]">
        <div className="space-y-1 p-1">
          {files.map((file) => (
            <CompactFileItem key={file.id} file={file} />
          ))}
          {currentHasMore && (
            <div className="flex justify-center p-3 border-t mt-2">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-xs text-gray-500">
                  Page {currentPage} • Loaded {totalLoaded} files
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchFiles(tab, true)}
                  disabled={loading[tab]}
                  className="text-xs"
                >
                  {loading[tab] ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            </div>
          )}
          {!currentHasMore && totalLoaded > 0 && (
            <div className="text-center py-2 text-xs text-gray-500">
              All {totalLoaded} files loaded
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div>
          <h2 className="text-base font-semibold text-gray-900">File Status</h2>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-gray-600">Context ID: {contextId}</p>
            <ApiStatusIndicator />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs px-2 py-1 h-7"
            disabled={loading[activeTab as keyof typeof loading]}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${loading[activeTab as keyof typeof loading] ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="text-xs px-3 py-1 h-7"
          >
            Back to Upload
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList
            className={`grid w-full h-9 ${showIngestionProgress ? "grid-cols-4" : "grid-cols-3"}`}
          >
            <TabsTrigger
              value="uploaded"
              className="flex items-center space-x-1 text-xs"
            >
              <Upload className="h-3 w-3" />
              <span>Uploaded</span>
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.uploaded}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="ingested"
              className="flex items-center space-x-1 text-xs"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Ingested</span>
              <Badge variant="default" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.ingested}
              </Badge>
            </TabsTrigger>
            {showIngestionProgress && (
              <TabsTrigger
                value="progress"
                className="flex items-center space-x-1 text-xs"
              >
                {allComplete ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
                <span>Processing</span>
                <Badge
                  variant={allComplete ? "default" : "secondary"}
                  className="ml-1 text-xs px-1.5 py-0.5"
                >
                  {Object.values(statusMap).filter((s) => s.isComplete).length}/
                  {filesForPolling.length}
                </Badge>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="total"
              className="flex items-center space-x-1 text-xs"
            >
              <FileText className="h-3 w-3" />
              <span>All Files</span>
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0.5">
                {tabCounts.total}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploaded" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <span>Uploaded Files</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {tabCounts.uploaded}
                    </Badge>
                  </CardTitle>
                  {apiData.uploaded && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.uploaded.data.length} of{" "}
                      {tabCounts.uploaded}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList("uploaded")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ingested" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Ingested Files</span>
                    <Badge variant="default" className="ml-2 text-xs">
                      {tabCounts.ingested}
                    </Badge>
                  </CardTitle>
                  {apiData.ingested && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.ingested.data.length} of{" "}
                      {tabCounts.ingested}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList("ingested")}
              </CardContent>
            </Card>
          </TabsContent>

          {showIngestionProgress && (
            <TabsContent value="progress" className="mt-3 h-[calc(100%-50px)]">
              <Card className="h-full">
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {allComplete ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      <span>Processing Status</span>
                      <Badge
                        variant={allComplete ? "default" : "secondary"}
                        className="ml-2 text-xs"
                      >
                        {
                          Object.values(statusMap).filter((s) => s.isComplete)
                            .length
                        }
                        /{filesForPolling.length}
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-gray-500">
                        {allComplete
                          ? "All Complete"
                          : filesForPolling.length > 0
                            ? `Processing ${filesForPolling.length} files...`
                            : "No files to process"}
                      </div>
                      {processedFiles.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Showing {visibleProcessedFiles.length} of{" "}
                          {processedFiles.length}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[calc(100%-60px)]">
                    <div className="space-y-2">
                      {processedFiles.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">
                            Waiting for files to be ready for processing...
                          </p>
                        </div>
                      ) : (
                        <>
                          {visibleProcessedFiles.map((file) => (
                            <IngestionProgressItem
                              key={file.id}
                              file={{
                                id: file.id.toString(),
                                fileName: file.fileName,
                                fileSize: parseInt(file.fileSize) || 0,
                                fileType:
                                  file.fileType || file.type || "unknown",
                              }}
                              status={statusMap[file.id.toString()]}
                            />
                          ))}
                          {hasMoreProcessingFiles && (
                            <div className="flex justify-center p-3 border-t mt-2">
                              <div className="flex flex-col items-center space-y-2">
                                <div className="text-xs text-gray-500">
                                  Showing {visibleProcessedFiles.length} of{" "}
                                  {processedFiles.length} files
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleLoadMoreProcessing}
                                  disabled={processingLoading}
                                  className="text-xs"
                                >
                                  {processingLoading ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      Loading...
                                    </>
                                  ) : (
                                    "Load More"
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                          {!hasMoreProcessingFiles &&
                            processedFiles.length > 0 && (
                              <div className="text-center py-2 text-xs text-gray-500">
                                All {processedFiles.length} files loaded
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="total" className="mt-3 h-[calc(100%-50px)]">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>All Files</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {tabCounts.total}
                    </Badge>
                  </CardTitle>
                  {apiData.total && (
                    <span className="text-xs text-gray-500">
                      Showing {apiData.total.data.length} of {tabCounts.total}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList("total")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
