import {
  ListFilter,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  CustomSelect,
  EmptyState,
  ErrorState,
  LoadingState,
  PAGE_SIZE_OPTIONS,
} from "../ui";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả tài khoản" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "deleted", label: "Đã xóa" },
];

export default function AdminUsersSection({
  error,
  isApproved,
  loading,
  message,
  onDelete,
  onLoadPage,
  onPageSizeChange,
  onSearchChange,
  onStatusFilterChange,
  pageInfo,
  pendingCount,
  rows,
  search,
  statusFilter,
  statusLabel,
  totalVisibleCount,
}) {
  return (
    <section className="admin-panel admin-users-panel" aria-labelledby="admin-users-title">
      <header className="admin-users-heading">
        <div className="admin-users-heading-copy">
          <p className="eyebrow">Quản trị tài khoản</p>
          <h2 id="admin-users-title">Người dùng trong hệ thống</h2>
          <p>
            Tìm kiếm, kiểm tra trạng thái và thực hiện thao tác với những tài khoản
            được phép quản lý.
          </p>
        </div>

        <div className="admin-users-heading-actions">
          <span className="admin-users-protection-note">
            <ShieldCheck size={17} aria-hidden="true" />
            Tài khoản hệ thống được bảo vệ
          </span>
          <Button
            tone="secondary"
            size="sm"
            className="admin-users-reload"
            onClick={() => onLoadPage()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Tải lại
          </Button>
        </div>
      </header>

      {message && (
        <div className={`api-message ${message.type}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <section className="admin-users-filter-card" aria-labelledby="admin-users-filter-title">
        <div className="admin-users-filter-heading">
          <span aria-hidden="true"><ListFilter size={18} /></span>
          <div>
            <h3 id="admin-users-filter-title">Tìm và lọc tài khoản</h3>
            <p>Kết quả được cập nhật ngay theo từ khóa và trạng thái bạn chọn.</p>
          </div>
        </div>

        <div className="admin-toolbar admin-users-toolbar">
          <label className="clean-field admin-users-search-field">
            <span>Tìm tài khoản</span>
            <span className="admin-users-search-control">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                autoComplete="off"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Email, tên hoặc ID"
                aria-describedby="admin-users-result-summary"
              />
            </span>
          </label>
          <CustomSelect
            className="clean-field admin-user-status-filter"
            label="Trạng thái"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={onStatusFilterChange}
          />
          <CustomSelect
            className="clean-field admin-toolbar-page-size"
            label="Hiển thị"
            value={pageInfo.pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
          />
        </div>

        <div
          className="admin-users-result-summary"
          id="admin-users-result-summary"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <UsersRound size={17} aria-hidden="true" />
          <span>
            <strong>{rows.length}</strong> đang hiển thị
            <span aria-hidden="true"> · </span>
            <strong>{pendingCount}</strong> chờ duyệt
            <span aria-hidden="true"> · </span>
            <strong>{totalVisibleCount}</strong> tài khoản có thể quản lý trong dữ liệu đã tải
          </span>
        </div>
      </section>

      {loading ? (
        <LoadingState label="Đang tải danh sách người dùng..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách tài khoản"
          description={error}
          action={(
            <Button onClick={() => onLoadPage()}>
              <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : rows.length ? (
        <div className="admin-users-card-list" role="list" aria-label="Danh sách tài khoản người dùng">
          {rows.map((item) => {
            const userId = item.identityId || item.userId || item.id;
            const displayName = item.displayName || item.name || item.email || "Người dùng";

            return (
              <article className="admin-user-card" key={userId} role="listitem">
                <div className="admin-user-card-main">
                  <div className="admin-user-avatar" aria-hidden="true">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="table-primary-cell">
                    <strong>{displayName}</strong>
                    <span>{item.email || "Chưa có email"}</span>
                    <small title={userId}>Mã: {userId}</small>
                  </div>
                </div>

                <div className="admin-user-card-status">
                  <small>Trạng thái</small>
                  <div>
                    <Badge tone={isApproved(item) ? "success" : "warning"}>{statusLabel(item)}</Badge>
                    <Badge tone={item.isDeleted ? "danger" : "info"}>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</Badge>
                  </div>
                </div>

                <div className="record-actions">
                  <Button
                    tone="danger"
                    size="sm"
                    className="admin-user-delete-btn"
                    aria-label={`Xóa tài khoản ${displayName}`}
                    onClick={() => onDelete(userId)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Xóa
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Không có tài khoản phù hợp"
          description="Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
          icon={<UsersRound size={20} />}
        />
      )}

      {!error && (
        <nav className="pagination-row admin-users-pagination" aria-label="Phân trang tài khoản">
          <Button
            tone="secondary"
            size="sm"
            type="button"
            disabled={pageInfo.pageNumber <= 1 || loading}
            onClick={() => onLoadPage(pageInfo.pageNumber - 1)}
          >
            Trước
          </Button>
          <span>
            Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1}
            <span aria-hidden="true"> · </span>
            {rows.length}/{totalVisibleCount} hiển thị
          </span>
          <Button
            tone="secondary"
            size="sm"
            type="button"
            disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading}
            onClick={() => onLoadPage(pageInfo.pageNumber + 1)}
          >
            Sau
          </Button>
        </nav>
      )}
    </section>
  );
}
