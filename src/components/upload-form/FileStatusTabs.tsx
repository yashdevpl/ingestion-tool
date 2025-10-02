import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMPLETE_STATUSES,
  FAILED_STATUSES,
  useIngestionPolling,
} from "../../hooks/use-ingestion-polling";
import { FileRecord } from "../../types/common";
import { CompactFileItem, type fileStatus } from "./CompactFileItem";

export interface ApiResponse {
  data: FileRecord[];
  totalCount: number;
  uploadedCount: number;
  readCount: number;
  ingestedCount: number;
}

export interface FileStatusItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate?: string;
  ingestionDate?: string;
  status: fileStatus | string;
  fileType: string;
  errorMessage?: string;
}

export interface FileStatusTabsProps {
  contextId?: number;
  dirPath: string;
  onBack: () => void;
  onProcessingStart?: () => void;
  onProcessingComplete?: () => void;
}

export interface PaginationState {
  skip: number;
  take: number;
  currentPage: number;
}

export interface TabState {
  uploaded: boolean;
  ingested: boolean;
  total: boolean;
  progress: boolean;
}

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { fetchFilesFromApi, fetchInitialCountsFromApi } from "../../lib/utils";
import { convertToFileStatusItems } from "../../utils/conversion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { IngestionProgressItem } from "./IngestionProgressItem";
import { ENV } from "../../utils/constants";
import { useAuthContextProvider } from "../../context/auth-context";

export const FileStatusTabs: React.FC<FileStatusTabsProps> = ({
  dirPath,
  contextId,
  onBack,
  onProcessingStart,
  onProcessingComplete,
}) => {
  const [activeTab, setActiveTab] = useState("total");

  // Total tab states
  const [totalData, setTotalData] = useState<ApiResponse | null>(null);
  const [totalLoading, setTotalLoading] = useState(false);
  const [totalSilentLoading, setTotalSilentLoading] = useState(false);
  const [totalError, setTotalError] = useState<string | null>(null);
  const [totalPagination, setTotalPagination] = useState({
    skip: 0,
    take: 2,
    currentPage: 1,
  });
  const [totalLoadedCount, setTotalLoadedCount] = useState(0);
  const [totalHasMore, setTotalHasMore] = useState(false);

  // Ingested tab states
  const [ingestedData, setIngestedData] = useState<ApiResponse | null>(null);
  const [ingestedLoading, setIngestedLoading] = useState(false);
  const [ingestedSilentLoading, setIngestedSilentLoading] = useState(false);
  const [ingestedError, setIngestedError] = useState<string | null>(null);
  const [ingestedPagination, setIngestedPagination] = useState({
    skip: 0,
    take: 2,
    currentPage: 1,
  });
  const [ingestedLoadedCount, setIngestedLoadedCount] = useState(0);
  const [ingestedHasMore, setIngestedHasMore] = useState(false);

  // Uploaded tab states
  const [uploadedData, setUploadedData] = useState<ApiResponse | null>(null);
  const [uploadedLoading, setUploadedLoading] = useState(false);
  const [uploadedSilentLoading, setUploadedSilentLoading] = useState(false);
  const [uploadedError, setUploadedError] = useState<string | null>(null);
  const [uploadedPagination, setUploadedPagination] = useState({
    skip: 0,
    take: 2,
    currentPage: 1,
  });
  const [uploadedLoadedCount, setUploadedLoadedCount] = useState(0);
  const [uploadedHasMore, setUploadedHasMore] = useState(false);

  // Shared states
  const [tabCounts, setTabCounts] = useState({
    uploaded: 0,
    ingested: 0,
    total: 0,
    progress: 0,
  });

  const [showIngestionProgress, setShowIngestionProgress] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<
    (FileRecord & { processingStatus?: any })[]
  >([]);
  const [globalCompletedFiles, setGlobalCompletedFiles] = useState<Set<string>>(
    new Set()
  );
  const [initialCountsLoaded, setInitialCountsLoaded] = useState(false);
  const [processingDisplayCount, setProcessingDisplayCount] = useState(2);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [allFilesPollingStopped, setAllFilesPollingStopped] = useState(false);

  // Stop polling when all files are ingested
  useEffect(() => {
    if (activeTab === "total" && totalData && totalData.data.length > 0) {
      const allIngested = totalData.data.every(
        (file) =>
          COMPLETE_STATUSES.includes(file.requestStatus?.toUpperCase()) ||
          FAILED_STATUSES.includes(file.requestStatus?.toUpperCase())
      );
      if (allIngested) {
        setAllFilesPollingStopped(true);
      }
    }
  }, [activeTab, totalData]);

  // Prepare files for ingestion polling
  const allFilesWithStatus = useMemo(() => {
    const allUploadedFiles = uploadedData?.data || [];
    const allIngestedFiles = ingestedData?.data || [];
    const allTotalFiles = totalData?.data || [];

    return allTotalFiles.map((file) => {
      const isUploaded = allUploadedFiles.some((f) => f.id === file.id);
      const isIngested = allIngestedFiles.some((f) => f.id === file.id);
      return {
        ...file,
        isUploaded: isUploaded || file.isUploaded,
        isIngested: isIngested || file.isIngested,
      };
    });
  }, [uploadedData?.data, ingestedData?.data, totalData?.data]);

  // Get files ready for polling
  const filesForPolling = useMemo(() => {
    const allReadyFiles = allFilesWithStatus
      .filter(
        (file) =>
          file.isUploaded &&
          file.isIngested &&
          file?.requestId &&
          !globalCompletedFiles.has(file.id.toString())
      )
      .map((file) => ({
        id: file.id.toString(),
        fileType: file.fileType || file.type || "unknown",
        isUploaded: file.isUploaded,
        isIngested: file.isIngested,
        requestId: file?.requestId,
      }));

    console.log(
      `Files for polling: ${allReadyFiles.length}, Completed: ${globalCompletedFiles.size}`
    );
    return allReadyFiles;
  }, [allFilesWithStatus, globalCompletedFiles]);

  // Handle file status changes from polling
  const handleFileStatusChange = useCallback(
    (fileId: string, status: any) => {
      if (status.isComplete || status.isFailed) {
        setGlobalCompletedFiles((prev) => new Set([...prev, fileId]));
        console.log(`File ${fileId} completed with status: ${status.status}`);
      }

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
  const { webProxyUrl } = useAuthContextProvider();
  // Start ingestion polling
  const { statusMap, isPolling, allComplete, activePollingCount } =
    useIngestionPolling({
      files: filesForPolling,
      baseUrl: webProxyUrl || "http://localhost:3001",
      isEnabled: true,
      pollingInterval: 3000,
      onFileStatusChange: handleFileStatusChange,
    });

  // Show ingestion progress when files are ready
  useEffect(() => {
    if (filesForPolling.length > 0 && !showIngestionProgress) {
      console.log("Files ready for processing, showing progress tab...");
      setShowIngestionProgress(true);
      if (activePollingCount > 0) {
        setActiveTab("progress");
      }
      onProcessingStart?.();
    }
  }, [
    filesForPolling.length,
    showIngestionProgress,
    activePollingCount,
    onProcessingStart,
  ]);

  // Notify when processing is complete
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

  // Update processed files
  useEffect(() => {
    const newFiles = allFilesWithStatus.filter(
      (file) => file.isUploaded && file.isIngested && file?.requestId
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
    setTimeout(() => {
      setProcessingDisplayCount((prev) => prev + 2);
      setProcessingLoading(false);
    }, 300);
  }, []);

  // Get visible processed files
  const visibleProcessedFiles = useMemo(() => {
    return processedFiles.slice(0, processingDisplayCount);
  }, [processedFiles, processingDisplayCount]);

  const hasMoreProcessingFiles = processedFiles.length > processingDisplayCount;

  const fetchInitialCounts = useCallback(async () => {
    if (!contextId || initialCountsLoaded) return;

    try {
      const apiResponse = await fetchInitialCountsFromApi(
        contextId,
        webProxyUrl
      );

      setTabCounts({
        uploaded: apiResponse.uploadedCount,
        ingested: apiResponse.ingestedCount,
        total: apiResponse.totalCount,
        progress: 0,
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

  const fetchTotalFiles = useCallback(
    async (loadMore = false, silentRefresh = false) => {
      if (!contextId) return;

      if (silentRefresh) {
        setTotalSilentLoading(true);
      } else {
        setTotalLoading(true);
      }
      setTotalError(null);

      try {
        let skip: number;
        let take: number;

        if (loadMore) {
          skip = totalLoadedCount;
          take = totalPagination.take;
        } else if (silentRefresh) {
          skip = 0;
          take = totalLoadedCount > 0 ? totalLoadedCount : totalPagination.take;
        } else {
          skip = 0;
          take = totalPagination.take;
        }

        const apiResponse = await fetchFilesFromApi({
          contextId,
          tab: "total",
          skip,
          take,
          baseUrl: webProxyUrl,
        });

        const hasMoreData = apiResponse.data.length === totalPagination.take;
        setTotalHasMore(hasMoreData);

        if (loadMore) {
          setTotalData((prev) =>
            prev
              ? {
                  ...apiResponse,
                  data: [...prev.data, ...apiResponse.data],
                }
              : apiResponse
          );
          setTotalLoadedCount((prev) => prev + apiResponse.data.length);
          setTotalPagination((prev) => ({
            ...prev,
            currentPage: prev.currentPage + 1,
          }));
        } else {
          setTotalData(apiResponse);
          if (!silentRefresh) {
            setTotalLoadedCount(apiResponse.data.length);
          }
        }

        setTabCounts((prev) => ({
          ...prev,
          uploaded: apiResponse.uploadedCount,
          ingested: apiResponse.ingestedCount,
          total: apiResponse.totalCount,
        }));
      } catch (error) {
        console.error("Error fetching total files:", error);
        setTotalError(
          error instanceof Error ? error.message : "Failed to fetch files"
        );
        setTotalHasMore(false);
      } finally {
        if (silentRefresh) {
          setTotalSilentLoading(false);
        } else {
          setTotalLoading(false);
        }
      }
    },
    [contextId, totalPagination, totalLoadedCount]
  );

  const fetchIngestedFiles = useCallback(
    async (loadMore = false, silentRefresh = false) => {
      if (!contextId) return;

      if (silentRefresh) {
        setIngestedSilentLoading(true);
      } else {
        setIngestedLoading(true);
      }
      setIngestedError(null);

      try {
        let skip: number;
        let take: number;

        if (loadMore) {
          skip = ingestedLoadedCount;
          take = ingestedPagination.take;
        } else if (silentRefresh) {
          skip = 0;
          take =
            ingestedLoadedCount > 0
              ? ingestedLoadedCount
              : ingestedPagination.take;
        } else {
          skip = 0;
          take = ingestedPagination.take;
        }

        const apiResponse = await fetchFilesFromApi({
          contextId,
          tab: "ingested",
          skip,
          take,
          baseUrl: webProxyUrl,
        });

        const filteredData = {
          ...apiResponse,
          data: apiResponse.data.filter(
            (file) => file.isIngested && file.isUploaded && file.isRead
          ),
        };

        const hasMoreData = apiResponse.data.length === ingestedPagination.take;
        setIngestedHasMore(hasMoreData);

        if (loadMore) {
          setIngestedData((prev) =>
            prev
              ? {
                  ...filteredData,
                  data: [...prev.data, ...filteredData.data],
                }
              : filteredData
          );
          setIngestedLoadedCount((prev) => prev + filteredData.data.length);
          setIngestedPagination((prev) => ({
            ...prev,
            currentPage: prev.currentPage + 1,
          }));
        } else {
          setIngestedData(filteredData);
          if (!silentRefresh) {
            setIngestedLoadedCount(filteredData.data.length);
          }
        }

        setTabCounts((prev) => ({
          ...prev,
          uploaded: apiResponse.uploadedCount,
          ingested: apiResponse.ingestedCount,
          total: apiResponse.totalCount,
        }));
      } catch (error) {
        console.error("Error fetching ingested files:", error);
        setIngestedError(
          error instanceof Error ? error.message : "Failed to fetch files"
        );
        setIngestedHasMore(false);
      } finally {
        if (silentRefresh) {
          setIngestedSilentLoading(false);
        } else {
          setIngestedLoading(false);
        }
      }
    },
    [contextId, ingestedPagination, ingestedLoadedCount]
  );

  const fetchUploadedFiles = useCallback(
    async (loadMore = false, silentRefresh = false) => {
      if (!contextId) return;

      if (silentRefresh) {
        setUploadedSilentLoading(true);
      } else {
        setUploadedLoading(true);
      }
      setUploadedError(null);

      try {
        let skip: number;
        let take: number;

        if (loadMore) {
          skip = uploadedLoadedCount;
          take = uploadedPagination.take;
        } else if (silentRefresh) {
          skip = 0;
          take =
            uploadedLoadedCount > 0
              ? uploadedLoadedCount
              : uploadedPagination.take;
        } else {
          skip = 0;
          take = uploadedPagination.take;
        }

        const apiResponse = await fetchFilesFromApi({
          contextId,
          tab: "uploaded",
          skip,
          take,
          baseUrl: webProxyUrl,
        });

        const hasMoreData = apiResponse.data.length === uploadedPagination.take;
        setUploadedHasMore(hasMoreData);

        if (loadMore) {
          setUploadedData((prev) =>
            prev
              ? {
                  ...apiResponse,
                  data: [...prev.data, ...apiResponse.data],
                }
              : apiResponse
          );
          setUploadedLoadedCount((prev) => prev + apiResponse.data.length);
          setUploadedPagination((prev) => ({
            ...prev,
            currentPage: prev.currentPage + 1,
          }));
        } else {
          setUploadedData(apiResponse);
          if (!silentRefresh) {
            setUploadedLoadedCount(apiResponse.data.length);
          }
        }

        setTabCounts((prev) => ({
          ...prev,
          uploaded: apiResponse.uploadedCount,
          ingested: apiResponse.ingestedCount,
          total: apiResponse.totalCount,
        }));
      } catch (error) {
        console.error("Error fetching uploaded files:", error);
        setUploadedError(
          error instanceof Error ? error.message : "Failed to fetch files"
        );
        setUploadedHasMore(false);
      } finally {
        if (silentRefresh) {
          setUploadedSilentLoading(false);
        } else {
          setUploadedLoading(false);
        }
      }
    },
    [contextId, uploadedPagination, uploadedLoadedCount]
  );

  useEffect(() => {
    fetchInitialCounts();
  }, [fetchInitialCounts]);

  useEffect(() => {
    if (activeTab === "total" && !totalData) {
      fetchTotalFiles();
    } else if (activeTab === "ingested" && !ingestedData) {
      fetchIngestedFiles();
    } else if (activeTab === "uploaded" && !uploadedData) {
      fetchUploadedFiles();
    }
  }, [
    activeTab,
    contextId,
    totalData,
    ingestedData,
    uploadedData,
    fetchTotalFiles,
    fetchIngestedFiles,
    fetchUploadedFiles,
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (activeTab === "total" && !allFilesPollingStopped) {
      interval = setInterval(() => {
        if (!totalLoading && !totalSilentLoading) {
          fetchTotalFiles(false, true);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    activeTab,
    allFilesPollingStopped,
    totalLoading,
    totalSilentLoading,
    fetchTotalFiles,
  ]);

  const handleRefresh = () => {
    if (activeTab === "total") {
      setTotalPagination({ skip: 0, take: 2, currentPage: 1 });
      setTotalLoadedCount(0);
      setTotalData(null);
      fetchTotalFiles(false, false);
    } else if (activeTab === "ingested") {
      setIngestedPagination({ skip: 0, take: 2, currentPage: 1 });
      setIngestedLoadedCount(0);
      setIngestedData(null);
      fetchIngestedFiles(false, false);
    } else if (activeTab === "uploaded") {
      setUploadedPagination({ skip: 0, take: 2, currentPage: 1 });
      setUploadedLoadedCount(0);
      setUploadedData(null);
      fetchUploadedFiles(false, false);
    }
  };

  const renderFileList = (tab: string) => {
    let isLoading: boolean;
    let apiResponse: ApiResponse | null;
    let errorMsg: string | null;
    let currentHasMore: boolean;
    let currentPage: number;
    let onLoadMore: () => void;

    if (tab === "total") {
      isLoading = totalLoading && !totalSilentLoading;
      apiResponse = totalData;
      errorMsg = totalError;
      currentHasMore = totalHasMore;
      currentPage = totalPagination.currentPage;
      onLoadMore = () => fetchTotalFiles(true);
    } else if (tab === "ingested") {
      isLoading = ingestedLoading && !ingestedSilentLoading;
      apiResponse = ingestedData;
      errorMsg = ingestedError;
      currentHasMore = ingestedHasMore;
      currentPage = ingestedPagination.currentPage;
      onLoadMore = () => fetchIngestedFiles(true);
    } else {
      isLoading = uploadedLoading && !uploadedSilentLoading;
      apiResponse = uploadedData;
      errorMsg = uploadedError;
      currentHasMore = uploadedHasMore;
      currentPage = uploadedPagination.currentPage;
      onLoadMore = () => fetchUploadedFiles(true);
    }

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
            onClick={handleRefresh}
            className="text-xs bg-transparent"
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
    const totalLoaded = apiResponse.data.length;

    return (
      <ScrollArea className="h-[450px]">
        <div className="space-y-1 p-1">
          {files.map((file) => (
            <CompactFileItem key={file.id} file={file} dirPath={dirPath} />
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
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="text-xs bg-transparent"
                >
                  {isLoading ? (
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
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div>
          <h2 className="text-base font-semibold text-gray-900">File Status</h2>
          <div className="flex items-center space-x-2 mt-1">
            <h2 className="text-sm font-bold text-gray-600">
              Folder Selected : {dirPath || "N/A"}
            </h2>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-gray-600">Context ID: {contextId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-xs px-2 py-1 h-7"
            disabled={totalLoading || ingestedLoading || uploadedLoading}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${totalLoading || ingestedLoading || uploadedLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="text-xs px-3 py-1 h-7 bg-transparent"
          >
            Back to Upload
          </Button>
        </div>
      </div>

      <div className="flex-1 p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className={`grid w-full h-9  grid-cols-3`}>
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
          </TabsList>
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
                  {ingestedData && (
                    <span className="text-xs text-gray-500">
                      Showing {ingestedData.data.length} of {tabCounts.ingested}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {renderFileList("ingested")}
              </CardContent>
            </Card>
          </TabsContent>

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
                        {processedFiles.length} files
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
                              fileSize: Number.parseInt(file.fileSize) || 0,
                              fileType: file.fileType || file.type || "unknown",
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
                                className="text-xs bg-transparent"
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
                  {totalData && (
                    <span className="text-xs text-gray-500">
                      Showing {totalData.data.length} of {tabCounts.total}
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
