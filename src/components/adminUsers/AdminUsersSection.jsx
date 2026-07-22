import { ListFilter, RefreshCw, Search, Trash2 } from "lucide-react";
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
          <p className="muted-text">Lọc tài khoản chờ duyệt, đã xác nhận và xóa người dùng khi cần. Tài khoản quản trị hệ thống được bảo vệ và không xuất hiện trong danh sách.</p>
        </div>
        <button className="btn btn-ghost btn-small admin-users-reload" type="button" onClick={() => onLoadPage()}>
          <RefreshCw size={15} aria-hidden="true" /> Tải lại
        </button>
      </div>

      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}

      <section className="admin-users-filter-card" aria-labelledby="admin-users-filter-title">
        <div className="admin-users-filter-heading">
          <span aria-hidden="true"><ListFilter size={18} /></span>
          <div>
            <h3 id="admin-users-filter-title">Bộ lọc tài khoản</h3>
            <p>Tìm và thu hẹp danh sách theo trạng thái. Kết quả được cập nhật ngay khi thay đổi.</p>
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
                placeholder="Email, tên hoặc mã người dùng"
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
