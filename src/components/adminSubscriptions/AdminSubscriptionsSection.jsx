import { Info, RefreshCw } from "lucide-react";
import { Button, ErrorState, LoadingState } from "../ui";
import SubscriptionPlanTable from "./SubscriptionPlanTable";
import AdminPaymentsPanel from "./AdminPaymentsPanel";

export default function AdminSubscriptionsSection({
  activeCount,
  error,
  loading,
  message,
  plans,
  onReload,
}) {
  return (
    <section className="admin-panel subscription-plan-admin-panel">
      <div className="panel-title-row subscription-plan-heading">
        <div>
          <p className="eyebrow">Gói đăng ký</p>
          <h2>Quản lý gói dịch vụ</h2>
          <p className="muted-text">Theo dõi các gói đang hiển thị trên trang bảng giá và trạng thái mở bán hiện tại.</p>
        </div>
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>
            <RefreshCw size={15} /> Đồng bộ
          </button>
        </div>
      </div>

      <div className="subscription-contract-notice" role="note">
        <Info size={18} aria-hidden="true" />
        <p><strong>Trang đang ở chế độ chỉ xem.</strong> Việc tạo, sửa, xóa gói và cấu hình lượt sử dụng sẽ được mở sau khi cơ chế phân quyền hoàn tất.</p>
      </div>

      {!loading && !error && (
        <section className="subscription-plan-kpis" aria-label="Tổng quan gói dịch vụ">
          <article>
            <span>Tổng số gói</span>
            <strong>{plans.length}</strong>
          </article>
          <article>
            <span>Đang mở bán</span>
            <strong>{activeCount}</strong>
          </article>
          <article>
            <span>Đang tạm ẩn</span>
            <strong>{Math.max(0, plans.length - activeCount)}</strong>
          </article>
        </section>
      )}

      {message && (
        <div
          className={`api-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live={message.type === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <LoadingState
          label="Đang tải danh sách gói dịch vụ..."
          description="Dữ liệu gói đăng ký đang được đồng bộ."
        />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách gói dịch vụ"
          description={error}
          urgent
          action={(
            <Button onClick={onReload}>
              <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : (
        <SubscriptionPlanTable
          plans={plans}
        />
      )}

      <AdminPaymentsPanel />
    </section>
  );
}
