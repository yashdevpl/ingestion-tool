import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";

interface APIPagination {
  page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface Props {
  pagination: APIPagination;
  onPageChange: (page: number) => void;
}

const generatePageNumbers = (
  current: number,
  total: number
): (number | "...")[] => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
};

export const TablePagination = ({ pagination, onPageChange }: Props) => {
  const { page, total_pages, has_prev, has_next } = pagination;

  const handlePageChange = (
    e: React.MouseEvent,
    newPage: number,
    condition: boolean = true
  ) => {
    e.preventDefault();
    if (condition && newPage !== page) onPageChange(newPage);
  };

  return (
    <Pagination>
      <PaginationContent className="space-x-0.5">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => handlePageChange(e, page - 1, has_prev)}
            className={`h-7 max-w-min px-2 text-xs ${!has_prev ? "pointer-events-none opacity-20" : ""}`}
            aria-disabled={!has_prev}
          />
        </PaginationItem>

        {generatePageNumbers(page, total_pages).map((item, idx) => (
          <PaginationItem key={idx}>
            {item === "..." ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                className="size-7 text-xs"
                isActive={item === page}
                onClick={(e) => handlePageChange(e, item)}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => handlePageChange(e, page + 1, has_next)}
            className={`h-7 max-w-min px-2 text-xs ${!has_next ? "pointer-events-none opacity-20" : ""}`}
            aria-disabled={!has_next}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
