import { CreditCard, RefreshCw } from "lucide-react";
import { Button, ErrorState, LoadingState } from "../ui";
import SubscriptionPlanTable from "./SubscriptionPlanTable";

export default function AdminSubscriptionsSection({
  activeCount,
  error,
  loading,
  message,
  plans,
  onCreate,
  onDelete,
  onEdit,
  onReload,
  onToggleStatus,
}) {
  return (
    <section className="admin-panel subscription-plan-admin-panel">
      <div className="panel-title-row subscription-plan-heading">
        <div>
          <p className="eyebrow">Gói đăng ký</p>
          <h2>Quản lý gói dịch vụ</h2>
          <p className="muted-text">Tạo và kích hoạt các gói xuất hiện trên trang bảng giá để người dùng đăng ký qua PayOS.</p>
        </div>
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>
            <RefreshCw size={15} /> Đồng bộ
          </button>
          <button className="btn btn-primary btn-small" type="button" onClick={onCreate}>
            <CreditCard size={15} /> Tạo gói
          </button>
        </div>
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
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      )}
    </section>
  );
}
