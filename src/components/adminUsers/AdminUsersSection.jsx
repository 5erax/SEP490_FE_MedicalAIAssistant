import { RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  CustomSelect,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PAGE_SIZE_OPTIONS,
} from "../ui";

export default function AdminUsersSection({
  error,
  isApproved,
  loading,
  message,
  onDelete,
  onLoadPage,
  onPageSizeChange,
  onSearchChange,
  pageInfo,
  rows,
  search,
  statusLabel,
}) {
  const columns = [
    {
      key: "user",
      header: "Người dùng",
      render: (item) => (
        <div className="table-primary-cell">
          <strong>{item.displayName || item.email || "Người dùng"}</strong>
          <span>{item.email || "Chưa có email"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <div className="admin-badge-stack">
          <Badge tone={isApproved(item) ? "success" : "warning"}>{statusLabel(item)}</Badge>
          <Badge tone={item.isDeleted ? "danger" : "info"}>{item.isDeleted ? "Đã xóa" : "Hoạt động"}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="record-actions">
          <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(item.identityId)}>Xóa</button>
        </div>
      ),
    },
  ];

  return (
    <section className="admin-panel admin-users-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h2>Tài khoản chờ duyệt</h2>
          <p className="muted-text">Chỉ hiển thị các tài khoản chưa được duyệt để admin xử lý nhanh hơn.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => onLoadPage()}>Tải lại</button>
      </div>
      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}
      <div className="admin-toolbar">
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo email hoặc tên..." />
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
      ) : (
        <DataTable
          caption="Danh sách tài khoản đang chờ quản trị viên duyệt"
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.identityId}
          emptyState={<EmptyState title="Không có tài khoản chờ duyệt" description="Các tài khoản đã duyệt hoặc đang hoạt động đã được ẩn khỏi danh sách này." />}
        />
      )}

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(pageInfo.pageNumber - 1)}>Trước</button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {rows.length} tài khoản cần duyệt</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(pageInfo.pageNumber + 1)}>Sau</button>
        </div>
      )}
    </section>
  );
}
