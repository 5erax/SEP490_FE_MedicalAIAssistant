import { RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
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
          <h2>Quản lý người dùng</h2>
          <p className="muted-text">Theo dõi trạng thái tài khoản và xử lý các tài khoản không còn phù hợp.</p>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => onLoadPage()}>Tải lại</button>
      </div>
      {message && <div className={`api-message ${message.type}`}>{message.text}</div>}
      <div className="admin-toolbar">
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm theo email hoặc tên..." />
        <select value={pageInfo.pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
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
          caption="Danh sách tài khoản trong hệ thống"
          columns={columns}
          rows={rows}
          getRowKey={(item) => item.identityId}
          emptyState={<EmptyState title="Không có tài khoản" description="Không tìm thấy tài khoản phù hợp với bộ lọc hiện tại." />}
        />
      )}

      {!error && (
        <div className="pagination-row">
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber <= 1 || loading} onClick={() => onLoadPage(pageInfo.pageNumber - 1)}>Trước</button>
          <span>Trang {pageInfo.pageNumber} / {pageInfo.totalPages || 1} · {rows.length} tài khoản</span>
          <button className="btn btn-ghost btn-small" type="button" disabled={pageInfo.pageNumber >= pageInfo.totalPages || loading} onClick={() => onLoadPage(pageInfo.pageNumber + 1)}>Sau</button>
        </div>
      )}
    </section>
  );
}
