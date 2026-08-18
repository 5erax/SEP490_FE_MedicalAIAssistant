import { useMemo, useState } from "react";
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
  const start = currentPage >= totalPages - 3
    ? totalPages - 5
    : Math.max(1, currentPage - 1);
  return [start, start + 1, start + 2, "jump", totalPages - 2, totalPages - 1, totalPages];
}

export default function AdminPagination({
  ariaLabel = "Phân trang",
  className = "",
  currentPage = 1,
  totalPages = 1,
  loading = false,
  onPageChange,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = clampPage(currentPage, safeTotalPages);
  const [jumpPage, setJumpPage] = useState("");

  const pageTokens = useMemo(
    () => buildPageTokens(safeCurrentPage, safeTotalPages),
    [safeCurrentPage, safeTotalPages],
  );

  function changePage(nextPage) {
    const targetPage = clampPage(nextPage, safeTotalPages);
    if (loading || targetPage === safeCurrentPage) return;
    setJumpPage("");
    onPageChange?.(targetPage);
  }

  function submitJump(event) {
    event.preventDefault();
    if (jumpPage.trim() === "") return;
    const targetPage = clampPage(Number(jumpPage), safeTotalPages);
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
          onClick={() => changePage(1)}
          aria-label="Về trang đầu tiên"
          title="Trang đầu"
        >
          &lt;
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
              <form className="admin-pagination-jump" key={token} onSubmit={submitJump}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={safeTotalPages}
                  value={jumpPage}
                  placeholder="…"
                  disabled={loading}
                  onChange={(event) => setJumpPage(event.target.value)}
                  aria-label={`Nhập số trang từ 1 đến ${safeTotalPages}, rồi nhấn Enter`}
                  title="Nhập số trang và nhấn Enter"
                />
              </form>
            )
          ))}
        </div>

        <button
          className="admin-pagination-direction"
          type="button"
          disabled={loading || safeCurrentPage >= safeTotalPages}
          onClick={() => changePage(safeTotalPages)}
          aria-label="Đến trang cuối cùng"
          title="Trang cuối"
        >
          &gt;
        </button>
      </div>

      <p className="admin-pagination-summary" role="status" aria-live="polite">
        <strong>Trang {safeCurrentPage}/{safeTotalPages}</strong>
      </p>
    </nav>
  );
}
