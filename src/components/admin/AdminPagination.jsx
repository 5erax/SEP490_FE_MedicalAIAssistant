import { useId, useMemo, useState } from "react";
import "../../styles/admin/admin-pagination.css";

function clampPage(page, totalPages) {
  const normalizedTotal = Math.max(1, Number(totalPages) || 1);
  const normalizedPage = Number(page) || 1;
  return Math.min(normalizedTotal, Math.max(1, normalizedPage));
}

function buildPageTokens(currentPage, totalPages) {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  for (let offset = -2; offset <= 2; offset += 1) {
    pages.add(currentPage + offset);
  }

  if (currentPage <= 5) {
    for (let page = 2; page <= 6; page += 1) pages.add(page);
  }

  if (currentPage >= totalPages - 4) {
    for (let page = totalPages - 5; page < totalPages; page += 1) pages.add(page);
  }

  const orderedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
  const tokens = [];

  orderedPages.forEach((page, index) => {
    if (index > 0 && page - orderedPages[index - 1] > 1) {
      tokens.push(`ellipsis-${orderedPages[index - 1]}-${page}`);
    }
    tokens.push(page);
  });

  return tokens;
}

export default function AdminPagination({
  ariaLabel = "Phân trang",
  className = "",
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = 10,
  itemCount = 0,
  itemLabel = "mục",
  loading = false,
  onPageChange,
}) {
  const jumpInputId = useId();
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = clampPage(currentPage, safeTotalPages);
  const [jumpPage, setJumpPage] = useState(String(safeCurrentPage));

  const pageTokens = useMemo(
    () => buildPageTokens(safeCurrentPage, safeTotalPages),
    [safeCurrentPage, safeTotalPages],
  );

  const firstItem = totalCount > 0
    ? ((safeCurrentPage - 1) * Math.max(1, Number(pageSize) || 1)) + 1
    : 0;
  const lastItem = totalCount > 0
    ? Math.min(totalCount, firstItem + Math.max(0, Number(itemCount) || 0) - 1)
    : 0;

  function changePage(nextPage) {
    const targetPage = clampPage(nextPage, safeTotalPages);
    if (loading || targetPage === safeCurrentPage) return;
    setJumpPage(String(targetPage));
    onPageChange?.(targetPage);
  }

  function submitJump(event) {
    event.preventDefault();
    const targetPage = clampPage(Number(jumpPage), safeTotalPages);
    setJumpPage(String(targetPage));
    changePage(targetPage);
  }

  return (
    <nav
      className={`admin-pagination ${className}`.trim()}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      <div className="admin-pagination-main">
        <button
          className="admin-pagination-direction"
          type="button"
          disabled={loading || safeCurrentPage <= 1}
          onClick={() => changePage(safeCurrentPage - 1)}
        >
          Trước
        </button>

        <div className="admin-pagination-pages" aria-label="Chọn trang">
          {pageTokens.map((token) => (
            typeof token === "number" ? (
              <button
                className="admin-pagination-page"
                type="button"
                key={token}
                aria-current={token === safeCurrentPage ? "page" : undefined}
                aria-label={`Trang ${token}`}
                disabled={loading}
                onClick={() => changePage(token)}
              >
                {token}
              </button>
            ) : (
              <span className="admin-pagination-ellipsis" key={token} aria-hidden="true">…</span>
            )
          ))}
        </div>

        <form className="admin-pagination-jump" onSubmit={submitJump}>
          <label htmlFor={jumpInputId}>Đến trang</label>
          <input
            id={jumpInputId}
            type="number"
            inputMode="numeric"
            min="1"
            max={safeTotalPages}
            value={jumpPage}
            disabled={loading || safeTotalPages <= 1}
            onChange={(event) => setJumpPage(event.target.value)}
            aria-label={`Nhập số trang từ 1 đến ${safeTotalPages}`}
          />
          <button type="submit" disabled={loading || safeTotalPages <= 1}>Đi</button>
        </form>

        <button
          className="admin-pagination-direction"
          type="button"
          disabled={loading || safeCurrentPage >= safeTotalPages}
          onClick={() => changePage(safeCurrentPage + 1)}
        >
          Sau
        </button>
      </div>

      <p className="admin-pagination-summary" role="status" aria-live="polite">
        <strong>Trang {safeCurrentPage}/{safeTotalPages}</strong>
        <span aria-hidden="true">·</span>
        <span>
          {totalCount > 0
            ? `${firstItem}–${Math.max(firstItem, lastItem)} / ${totalCount} ${itemLabel}`
            : `0 ${itemLabel}`}
        </span>
      </p>
    </nav>
  );
}
