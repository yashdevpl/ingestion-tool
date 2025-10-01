"use client";

import { useEffect, useState } from "react";
import { Context } from "../types/common";
import { ColumnDefinition, DataTable } from "../components/data-table";
import { formatDate } from "../utils/conversion";
import { Badge } from "../components/ui/badge";
import { useAuthContextProvider } from "../context/auth-context";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  filteredCount: number;
};

const ContextsTable = () => {
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    limit: 2,
    totalItems: 0,
    totalPages: 0,
    filteredCount: 0,
  });
  const [data, setData] = useState<Context[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const router = useNavigate();

  const { userInfo } = useAuthContextProvider();

  const getContextHistory = async (page: number, limit: number) => {
    setLoading(true);
    setError(null);

    try {
      const skip = page * limit;
      const response = await axios.get(
        `http://localhost:3001/api/upload-context/${userInfo?.sub || ""}?skip=${skip}&take=${limit}`
      );

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
    } catch (error) {
      console.error("Failed to fetch context history:", error);
      setError("Failed to load context history. Please try again.");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (userInfo?.sub) {
      getContextHistory(0, pagination.limit);
    }
  }, [userInfo?.sub]);

  const handleRetry = () => {
    getContextHistory(pagination.page - 1, pagination.limit);
  };

  const columns: Array<ColumnDefinition<Context>> = [
    {
      key: "createdAt",
      header: "Created At",
      sortable: true,
      render: (record) => {
        const { formattedDate, formattedTime } = formatDate(record.createdAt);
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
      key: "userEmail",
      header: "User Email",
      sortable: true,
      render: (record) => (
        <span className="text-sm font-medium">{record.userEmail}</span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (record) => (
        <span className=" text-xs text-muted-foreground">
          {record.ipAddress}
        </span>
      ),
    },
    {
      key: "folderPath",
      header: "Folder Path",
      render: (record) =>
        record.folderPath ? (
          <span className="max-w-xs truncate text-sm" title={record.folderPath}>
            {record.folderPath}
          </span>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Not Provided
          </Badge>
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
          <h2 className="text-xl font-semibold tracking-tight">
            Upload Contexts History
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View the history of your upload contexts below.
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
          <h2 className="text-xl font-semibold tracking-tight">
            Upload Contexts History
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View the history of your upload contexts below.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-12">
          <Database className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No Upload History</h3>
          <p className="text-center text-sm text-muted-foreground">
            You haven't uploaded any contexts yet. Your upload history will
            appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Upload Contexts History
        </h2>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            View the history of your upload contexts below.
          </p>
          <span className="text-xs text-muted-foreground">
            {pagination.totalItems}{" "}
            {pagination.totalItems === 1 ? "record" : "records"}
          </span>
        </div>
      </div>

      <div className="relative">
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
            `bg-background hover:bg-accent ${"bg-accent/50"}`
          }
          onRowClick={(row) =>
            router(`/file-uploads/${row.id}`, {
              state: {
                contextId: row.id,
                folderPath: row.folderPath,
                userEmail: row.userEmail,
              },
            })
          }
          itemsPerPage={pagination.limit}
          currentPage={pagination.page}
          totalRecords={pagination.totalItems}
          onPageChange={(page) => getContextHistory(page - 1, pagination.limit)}
          onPageSizeChange={(pageSize) => {
            setPagination((prev) => ({ ...prev, limit: pageSize }));
            getContextHistory(0, pageSize);
          }}
          data={data}
          columns={columns as any}
          getRowKey={(record) => record.id}
        />
      </div>
    </div>
  );
};

export default ContextsTable;
