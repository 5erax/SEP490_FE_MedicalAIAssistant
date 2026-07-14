import { RefreshCw, Search, Trash2 } from "lucide-react";
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
    <section className="admin-panel admin-users-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h2>Quản lý người dùng</h2>
          <p className="muted-text">Lọc tài khoản chờ duyệt, đã xác nhận và xóa từng người dùng khi cần.</p>
        </div>
        <button className="btn btn-ghost btn-small admin-users-reload" type="button" onClick={() => onLoadPage()}>
          <RefreshCw size={15} aria-hidden="true" /> Tải lại
        </button>
      </div>

      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}

      <div className="admin-toolbar admin-users-toolbar">
        <label className="admin-users-search-field">
          <Search size={17} aria-hidden="true" />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo email, tên hoặc ID..." />
        </label>
        <CustomSelect
          className="admin-user-status-filter"
          label="Trạng thái"
          hideLabel
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={onStatusFilterChange}
        />
        <CustomSelect
          className="admin-toolbar-page-size"
          label="Per page"
          hideLabel
          value={pageInfo.pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={(nextPageSize) => onPageSizeChange(Number(nextPageSize))}
        />
      </div>

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
                    <small>{userId}</small>
                  </div>
                </div>

                <div className="admin-user-card-status">
                  <Badge tone={isApproved(item) ? "success" : "warning"}>{statusLabel(item)}</Badge>
                  <Badge tone={item.isDeleted ? "danger" : "info"}>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</Badge>
                </div>

                <div className="record-actions">
                  <button className="btn btn-dark btn-small admin-user-delete-btn" type="button" onClick={() => onDelete(userId)}>
                    <Trash2 size={14} aria-hidden="true" /> Xóa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Không có tài khoản phù hợp" description="Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm." />
      )}

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(pageInfo.pageNumber - 1)}>Trước</button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {rows.length}/{totalVisibleCount} hiển thị · {pendingCount} chờ duyệt</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(pageInfo.pageNumber + 1)}>Sau</button>
        </div>
      )}
    </section>
  );
}
