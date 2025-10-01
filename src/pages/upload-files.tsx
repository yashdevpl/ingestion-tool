import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ColumnDefinition, DataTable } from "../components/data-table";
import { formatDate } from "../utils/conversion";
import { Badge } from "../components/ui/badge";
import {
  AlertCircle,
  Database,
  RefreshCw,
  FileAudio,
  ArrowBigLeftDash,
} from "lucide-react";
import axios from "axios";
import {
  getStatusColor,
  getStatusLabel,
} from "../components/upload-form/CompactFileItem";
import { Button } from "../components/ui/button";
import { ENV } from "../utils/constants";

type FileUpload = {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: string;
  fileType: string;
  mimeType: string;
  type: string;
  isUploaded: boolean;
  isRead: boolean;
  isIngested: boolean;
  uploadedAt: string;
  requestId: string;
  contextId: number;
  requestStatus: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  filteredCount: number;
};

type FileUploadsResponse = {
  data: FileUpload[];
  totalCount: number;
  uploadedCount: number;
  readCount: number;
  ingestedCount: number;
  pagination: Pagination;
};

const FileUploadsTable = () => {
  const { contextId } = useParams<{ contextId: string }>();
  const location = useLocation();
  const { folderPath, userEmail } = location.state || {};
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    limit: 2,
    totalItems: 0,
    totalPages: 0,
    filteredCount: 0,
  });
  const [data, setData] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalCount: 0,
    uploadedCount: 0,
    readCount: 0,
    ingestedCount: 0,
  });
  const router = useNavigate();

  const getFileUploads = async (page: number, limit: number) => {
    if (!contextId) {
      setError("Context ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const skip = page * limit;
      const response = await axios.get<FileUploadsResponse>(
        `${ENV.WEB_APP_PROXY_URL}/api/file-uploads?contextId=${contextId}&skip=${skip}&take=${limit}`
      );

      if (response.data) {
        setData(response.data.data);
        setStats({
          totalCount: response.data.totalCount,
          uploadedCount: response.data.uploadedCount,
          readCount: response.data.readCount,
          ingestedCount: response.data.ingestedCount,
        });

        // Set pagination based on response or calculate from data

        if (response.data) {
          setData(response.data.data);
          setPagination({
            page: page + 1,
            limit,
            totalItems: response.data.pagination.totalItems,
            totalPages: response.data.pagination.totalPages,
            filteredCount: response.data.pagination.filteredCount,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch file uploads:", err);
      setError("Failed to load file uploads. Please try again.");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (contextId) {
      getFileUploads(0, pagination.limit);
    }
  }, [contextId]);

  const handleRetry = () => {
    getFileUploads(pagination.page - 1, pagination.limit);
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      KEYWORD_DETECTION_COMPLETE: { variant: "default", label: "Complete" },
      COMPLETED: { variant: "default", label: "Complete" },
      PROCESSING: { variant: "secondary", label: "Processing" },
      FAILED: { variant: "destructive", label: "Failed" },
      PENDING: { variant: "outline", label: "Pending" },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status,
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs px-2 py-0.5 capitalize whitespace-nowrap ${getStatusColor(
          status
        )}`}
      >
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const columns: Array<ColumnDefinition<FileUpload>> = [
    {
      key: "fileName",
      header: "File Name",
      sortable: true,
      render: (record) => (
        <div className="flex items-center gap-2">
          <FileAudio className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span
              className="text-sm font-medium max-w-xs truncate"
              title={record.fileName}
            >
              {record.fileName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(record.fileSize)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "uploadedAt",
      header: "Uploaded At",
      sortable: true,
      render: (record) => {
        const { formattedDate, formattedTime } = formatDate(record.uploadedAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formattedDate}</span>
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
          </div>
        );
      },
    },
    {
      key: "requestStatus",
      header: "Status",
      render: (record) => getStatusBadge(record.requestStatus),
    },
    {
      key: "type",
      header: "Type",
      render: (record) => (
        <Badge variant="secondary" className="text-xs">
          {record.type}
        </Badge>
      ),
    },
    {
      key: "contextId",
      header: "Flags",
      render: (record) => (
        <div className="flex gap-1">
          {record.isUploaded && getStatusBadge("uploaded")}
          {record.isRead && getStatusBadge("read")}
          {record.isIngested && getStatusBadge("ingested")}
        </div>
      ),
    },
  ];

  // Initial loading state
  if (initialLoad && loading) {
    return (
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-6 space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="rounded-lg border bg-card">
          <div className="space-y-3 p-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-12 flex-1 animate-pulse rounded-md bg-muted" />
                <div className="h-12 flex-1 animate-pulse rounded-md bg-muted" />
                <div className="h-12 flex-1 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">File Uploads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View all uploaded files for this context.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-12">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold">Failed to Load Data</h3>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">File Uploads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View all uploaded files for this context.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-12">
          <Database className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No Files Uploaded</h3>
          <p className="text-center text-sm text-muted-foreground">
            No files have been uploaded for this context yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
      <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            File Uploads
          </h2>
          <Button
            onClick={() => router(-1)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            <ArrowBigLeftDash className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mt-4   text-sm text-gray-700 dark:text-gray-300">
          <div>
            <span className="font-semibold">User Email:</span>{" "}
            {userEmail || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Folder Path:</span>{" "}
            {folderPath || "N/A"}
          </div>
        </div>
      </div>

      <div className="relative mt-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}

        <DataTable
          getRowClassName={(data) =>
            `bg-background hover:bg-accent ${data.isIngested ? "" : "bg-accent/50"}`
          }
          itemsPerPage={pagination.limit}
          currentPage={pagination.page}
          totalRecords={pagination.totalItems}
          onPageChange={(page) => getFileUploads(page - 1, pagination.limit)}
          onPageSizeChange={(pageSize) => {
            setPagination((prev) => ({ ...prev, limit: pageSize }));
            getFileUploads(0, pageSize);
          }}
          data={data}
          columns={columns as any}
          getRowKey={(record) => record.id.toString()}
        />
      </div>
    </div>
  );
};

export default FileUploadsTable;
