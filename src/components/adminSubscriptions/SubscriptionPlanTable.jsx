import { Badge, DataTable, EmptyState } from "../ui";
import { CreditCard } from "lucide-react";

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

export default function SubscriptionPlanTable({ plans }) {
  if (!plans.length) {
    return (
      <EmptyState
        className="subscription-plan-empty"
        icon={<CreditCard size={26} />}
        title="Chưa có gói dịch vụ"
        description="Danh sách gói sẽ xuất hiện tại đây khi có dữ liệu được cung cấp."
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
          header: "Lượt sử dụng",
          render: () => <span className="subscription-limit-summary">Chưa có dữ liệu hạn mức đã xác nhận</span>,
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
      ]}
    />
  );
}
