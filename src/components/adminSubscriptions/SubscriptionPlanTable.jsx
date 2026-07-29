import { Badge, Button, DataTable, EmptyState } from "../ui";
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
};

const NON_PRODUCTION_LIMIT_KEYS = new Set([
  "recoveryPlanPerMonth",
  "medicationScanPerMonth",
]);

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
    const entries = Object.entries(JSON.parse(value))
      .filter(([key]) => !NON_PRODUCTION_LIMIT_KEYS.has(key));
    if (!entries.length) return "Chưa có hạn mức production được xác nhận";
    const visibleEntries = entries.slice(0, 3);
    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
    return (
      <>
        {visibleEntries.map(([key, limit]) => (
          <span className="subscription-limit-row" key={key}>
            <span>{formatLimitKey(key)}</span>
            <strong>{limit}</strong>
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="subscription-limit-more">+{hiddenCount} hạn mức khác</span>
        )}
      </>
    );
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
    <DataTable
      className="subscription-plan-table-wrap"
      caption="Danh sách gói dịch vụ theo bộ lọc hiện tại"
      rowHeaderKey="plan"
      getRowKey={(plan) => plan.id}
      rows={plans}
      columns={[
        {
          key: "plan",
          header: "Gói dịch vụ",
          render: (plan) => (
            <div className="subscription-plan-primary">
              <span className="subscription-plan-icon"><CreditCard size={18} /></span>
              <div>
                <strong>{plan.planName || "Gói chưa đặt tên"}</strong>
                <span>{formatPrice(plan.price)}</span>
              </div>
            </div>
          ),
        },
        {
          key: "duration",
          header: "Thời hạn",
          render: (plan) => `${plan.durationInDays} ngày`,
        },
        {
          key: "limits",
          header: "Giới hạn tính năng",
          render: (plan) => (
            <span className="subscription-limit-summary">{summarizeLimits(plan.featureLimitJson)}</span>
          ),
        },
        {
          key: "updated",
          header: "Cập nhật",
          render: (plan) => formatDate(plan.updatedAt || plan.createdAt),
        },
        {
          key: "status",
          header: "Trạng thái",
          render: (plan) => (
            <Badge tone={plan.isActive ? "success" : "warning"}>
              {plan.isActive ? "Đang bán" : "Tạm ẩn"}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Thao tác",
          render: (plan) => (
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
          ),
        },
      ]}
    />
  );
}
