import {
  BookDashed,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
} from "lucide-react";
import { Fragment, ReactNode, useCallback, useMemo, useState } from "react";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const compareValues = (a: unknown, b: unknown, direction: "asc" | "desc") => {
  if (a == null && b == null) return 0;
  if (a == null) return direction === "asc" ? -1 : 1;
  if (b == null) return direction === "asc" ? 1 : -1;

  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }

  if (a < b) return direction === "asc" ? -1 : 1;
  if (a > b) return direction === "asc" ? 1 : -1;
  return 0;
};

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean;
  direction?: "asc" | "desc";
}) => {
  if (!active)
    return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-80" />;
  return direction === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
};

export interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
  sortFn?: (a: T, b: T, direction: "asc" | "desc") => number;
}

export interface RowAction<T> {
  icon?: ReactNode;
  onClick?: (item: T) => void;
  render?: (item: T) => ReactNode;
  label: string;
  variant?: "default" | "ghost";
  className?: string;
}

export type CustomColumnDefinition<T> = ColumnDefinition<T> & { flex: boolean };

export interface DataTableProps<T> {
  data: T[];
  columns: CustomColumnDefinition<T>[];
  rowActions?: RowAction<T>[];
  caption?: string;
  getRowKey?: (item: T, index: number) => React.Key;
  onRowClick?: (item: T) => void;
  getRowClassName?: (item: T) => string;
  itemsPerPage?: number;
  currentPage: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  className?: string;
}

type Props = {
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

const TablePagination = ({
  totalPages,
  currentPage,
  itemsPerPage,
  totalRecords = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 50, 100],
}: Props) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);

  // Determine which controls to show
  const showPagination = totalPages > 1;
  const showPageSizeSelector =
    onPageSizeChange && totalRecords > Math.min(...pageSizeOptions);
  const showPrevButton = currentPage > 1;
  const showNextButton = currentPage < totalPages;

  const visiblePages = useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }, [totalPages, currentPage]);

  // Don't render anything if there's no data
  if (totalRecords === 0) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-3">
      {/* Info + PageSize */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1} to {endIndex} of {totalRecords}{" "}
          {totalRecords === 1 ? "entry" : "entries"}
        </div>

        {onPageSizeChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Pagination Buttons - Only show if needed */}
      {showPagination && (
        <div className="flex items-center gap-1">
          {showPrevButton && (
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700 transition-colors"
            >
              Prev
            </button>
          )}

          {visiblePages.map((page, idx) =>
            page === "..." ? (
              <span key={idx} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange?.(Number(page))}
                className={`px-3 py-1 border rounded transition-colors ${
                  page === currentPage
                    ? "bg-blue-500 text-white border-blue-500"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700"
                }`}
              >
                {page}
              </button>
            )
          )}

          {showNextButton && (
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const DataTable = <T,>({
  data = [],
  columns = [],
  rowActions = [],
  getRowKey = (_, index) => index,
  onRowClick,
  itemsPerPage = 10,
  className = "",
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 50, 100],
  totalRecords,
  getRowClassName,
  rowExpansion,
}: DataTableProps<T> & {
  rowExpansion?: (item: T) => React.ReactNode;
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>();

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const currentColumn = columns.find(
      (col) => String(col.key) === sortConfig.key
    );

    return [...data].sort((a, b) => {
      // Use custom sort function if provided
      if (currentColumn?.sortFn) {
        return currentColumn.sortFn(a, b, sortConfig.direction);
      }

      // Get the values to compare
      let valueA = a[sortConfig.key as keyof T];
      let valueB = b[sortConfig.key as keyof T];

      // Special handling for array with single object (like criticality)
      if (
        Array.isArray(valueA) &&
        valueA.length === 1 &&
        Array.isArray(valueB) &&
        valueB.length === 1
      ) {
        valueA = valueA[0]?.value;
        valueB = valueB[0]?.value;
      }

      return compareValues(valueA, valueB, sortConfig.direction);
    });
  }, [data, sortConfig, columns]);

  const handleSort = useCallback((key: keyof T, sortable = true) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev?.key === String(key)) {
        if (prev.direction === "asc")
          return { key: String(key), direction: "desc" };
        if (prev.direction === "desc") return null;
      }
      return { key: String(key), direction: "asc" };
    });
  }, []);

  const totalPages = Math.ceil((totalRecords || 0) / itemsPerPage);

  if (totalRecords === 0)
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground/80">
        <BookDashed className="size-16" />
        <p className="text-center text-lg font-medium">No records found!</p>
      </div>
    );

  return (
    <div className={`dark:border-gray-700 dark:bg-gray-900 ${className}`}>
      <Table className="w-full table-auto border-collapse">
        <TableHeader>
          <TableRow className="border-gray-400">
            {columns.map((col, idx) => (
              <TableHead
                key={idx}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "h-10 overflow-hidden text-xs font-semibold whitespace-nowrap",
                  !col.sortable &&
                    "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                  col.flex && "w-full"
                )}
                onClick={() => handleSort(col.key, col.sortable)}
              >
                <div className="flex items-center">
                  <span className="truncate">{col.header}</span>
                  {col.sortable !== false && (
                    <SortIcon
                      active={sortConfig?.key === String(col.key)}
                      direction={sortConfig?.direction}
                    />
                  )}
                </div>
              </TableHead>
            ))}
            {rowActions.length > 0 && (
              <TableHead className="text-right text-xs text-muted-foreground">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedData.map((item, rowIndex) => {
            const rowKey = getRowKey(item, rowIndex);
            return (
              <Fragment key={rowKey}>
                <TableRow
                  className={cn(
                    "dark:hover:bg-gray-800",
                    onRowClick && "cursor-pointer",
                    rowExpansion && rowExpansion(item) && "border-b-0",
                    getRowClassName && getRowClassName(item)
                  )}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={colIndex}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        "overflow-hidden text-xs whitespace-nowrap",
                        col.flex ? "w-full" : "w-auto",
                        col.className,
                        getRowClassName && getRowClassName(item)
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? "")}
                    </TableCell>
                  ))}

                  {rowActions.length > 0 && (
                    <TableCell className="w-10 text-right">
                      {rowActions.map((action, i) =>
                        action.render ? (
                          action.render(item)
                        ) : (
                          <Button
                            key={i}
                            variant={action.variant ?? "ghost"}
                            size="icon"
                            onClick={() => action.onClick?.(item)}
                            className={action.className ?? "h-8 w-8"}
                            title={action.label}
                          >
                            {action.icon}
                          </Button>
                        )
                      )}
                    </TableCell>
                  )}
                </TableRow>

                {rowExpansion && rowExpansion(item) && (
                  <TableRow className="border-b hover:bg-transparent dark:border-gray-700 dark:bg-gray-900">
                    <TableCell
                      colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
                      className="p-0"
                    >
                      <div className="py-2">{rowExpansion(item)}</div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <TablePagination
        totalPages={totalPages}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
};
