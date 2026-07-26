import { Badge, Button, EmptyState } from "../ui";
import { CreditCard, Pencil, Power, Trash2 } from "lucide-react";

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

const FEATURE_LIMIT_LABELS = {
  symptomAnalysisPerMonth: "Phân tích triệu chứng / tháng",
  aiChatPerDay: "Chat AI / ngày",
  clinicalQuestionPerMonth: "Câu hỏi lâm sàng / tháng",
  recoveryPlanPerMonth: "Kế hoạch phục hồi / tháng",
  medicationScanPerMonth: "Kiểm tra thuốc / tháng",
};

function formatLimitKey(key) {
  if (FEATURE_LIMIT_LABELS[key]) return FEATURE_LIMIT_LABELS[key];
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function summarizeLimits(value) {
  if (!value) return "Không giới hạn riêng";
  try {
    const entries = Object.entries(JSON.parse(value));
    if (!entries.length) return "Không giới hạn riêng";
    return entries.slice(0, 3).map(([key, limit]) => (
      <span className="subscription-limit-row" key={key}>
        <span>{formatLimitKey(key)}</span>
        <strong>{limit}</strong>
      </span>
    ));
  } catch {
    return "Dữ liệu giới hạn chưa đúng định dạng";
  }
}

export default function SubscriptionPlanTable({ plans, onEdit, onToggleStatus, onDelete, onCreate }) {
  if (!plans.length) {
    return (
      <EmptyState
        className="subscription-plan-empty"
        icon={<CreditCard size={26} />}
        title="Chưa có gói dịch vụ"
        description="Tạo gói đầu tiên để người dùng có thể đăng ký và thanh toán trên trang bảng giá."
        action={(
          <Button onClick={onCreate}>
            <CreditCard size={15} aria-hidden="true" /> Tạo gói dịch vụ
          </Button>
        )}
      />
    );
  }

  return (
    <div className="subscription-plan-card-list" role="list" aria-label="Danh sách gói dịch vụ">
      <div className="subscription-plan-list-header" aria-hidden="true">
        <span>Gói dịch vụ</span>
        <span>Thời hạn / Cập nhật</span>
        <span>Giới hạn tính năng</span>
        <span>Trạng thái</span>
        <span>Thao tác</span>
      </div>
      {plans.map((plan) => (
        <article className="subscription-plan-card" key={plan.id} role="listitem">
          <div className="subscription-plan-card-main">
            <div className="subscription-plan-primary">
              <span className="subscription-plan-icon"><CreditCard size={18} /></span>
              <div>
                <strong>{plan.planName || "Gói chưa đặt tên"}</strong>
                <span>{formatPrice(plan.price)}</span>
              </div>
            </div>
          </div>

          <div className="subscription-plan-card-meta">
            <span>
              <small>Thời hạn</small>
              <strong>{plan.durationInDays} ngày</strong>
            </span>
            <span>
              <small>Cập nhật</small>
              <strong>{formatDate(plan.updatedAt || plan.createdAt)}</strong>
            </span>
          </div>

          <div className="subscription-plan-card-limits">
            <small>Giới hạn tính năng</small>
            <span className="subscription-limit-summary">{summarizeLimits(plan.featureLimitJson)}</span>
          </div>

          <div className="subscription-plan-card-status">
            <Badge tone={plan.isActive ? "success" : "warning"}>
              {plan.isActive ? "Đang bán" : "Tạm ẩn"}
            </Badge>
          </div>

          <div className="record-actions subscription-plan-actions">
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(plan)}>
              <Pencil size={14} /> Sửa
            </button>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(plan)}>
              <Power size={14} /> {plan.isActive ? "Tạm ẩn" : "Mở bán"}
            </button>
            <button className="btn btn-dark btn-small subscription-delete-button" type="button" onClick={() => onDelete(plan)}>
              <Trash2 size={14} /> Xóa
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
