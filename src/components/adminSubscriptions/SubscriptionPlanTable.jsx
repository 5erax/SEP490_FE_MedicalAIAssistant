import { Badge, DataTable } from "../ui";
import { CreditCard, Pencil, Power, Trash2 } from "lucide-react";

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

function summarizeLimits(value) {
  if (!value) return "Không giới hạn riêng";
  try {
    const entries = Object.entries(JSON.parse(value));
    if (!entries.length) return "Không giới hạn riêng";
    return entries.slice(0, 2).map(([key, limit]) => `${key}: ${limit}`).join(" · ");
  } catch {
    return "Dữ liệu giới hạn chưa đúng JSON";
  }
}

export default function SubscriptionPlanTable({ plans, onEdit, onToggleStatus, onDelete, onCreate }) {
  const columns = [
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
      render: (plan) => <strong>{plan.durationInDays} ngày</strong>,
    },
    {
      key: "limits",
      header: "Giới hạn tính năng",
      render: (plan) => <span className="subscription-limit-summary">{summarizeLimits(plan.featureLimitJson)}</span>,
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
      key: "updatedAt",
      header: "Cập nhật",
      render: (plan) => <span>{formatDate(plan.updatedAt || plan.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (plan) => (
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onEdit(plan)}>
            <Pencil size={14} /> Sửa
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => onToggleStatus(plan)}>
            <Power size={14} /> {plan.isActive ? "Tạm ẩn" : "Mở bán"}
          </button>
          <button className="btn btn-dark btn-small" type="button" onClick={() => onDelete(plan)}>
            <Trash2 size={14} /> Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      caption="Danh sách gói dịch vụ"
      columns={columns}
      rows={plans}
      getRowKey={(plan) => plan.id}
      emptyState={(
        <section className="ui-empty subscription-plan-empty">
          <span className="subscription-plan-empty-icon"><CreditCard size={26} /></span>
          <strong>Chưa có gói dịch vụ</strong>
          <p>Tạo gói đầu tiên để người dùng có thể đăng ký và thanh toán trên trang bảng giá.</p>
          <button className="btn btn-primary btn-small" type="button" onClick={onCreate}>
            <CreditCard size={15} /> Tạo gói dịch vụ
          </button>
        </section>
      )}
    />
  );
}
