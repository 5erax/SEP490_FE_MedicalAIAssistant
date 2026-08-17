import { Badge, Button, EmptyState } from "../ui";
import { CreditCard, Gauge, Pencil, Plus } from "lucide-react";

const QUOTA_LABELS = {
  SERVICE_CREDIT: "Lượt dịch vụ dùng chung",
  RECOVERY_PLAN_REQUEST: "Kế hoạch phục hồi",
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getPlanQuotas(plan) {
  return Array.isArray(plan?.quotas) ? plan.quotas : [];
}

function getResetPeriodLabel(value) {
  if (value === "subscriptionCycle") return "mỗi chu kỳ";
  return value || "theo chu kỳ";
}

function getQuotaTitle(quota) {
  const code = quota.quotaCode || quota.code;
  return QUOTA_LABELS[code] || quota.quotaName || quota.name || code || "Hạn mức";
}

function getQuotaSummary(quota) {
  const code = quota.quotaCode || quota.code;
  if (code === "SERVICE_CREDIT") return "không hết hạn";
  if (code === "RECOVERY_PLAN_REQUEST") return "mỗi chu kỳ gói";
  return getResetPeriodLabel(quota.resetPeriod);
}

function getQuotaAmount(quota) {
  const limit = Number(quota.limitValue || 0).toLocaleString("vi-VN");
  const code = quota.quotaCode || quota.code;
  return `${limit} ${code === "SERVICE_CREDIT" ? "lượt" : (quota.unit || "lượt")}`;
}

function getRealQuotaItems(plan) {
  return getPlanQuotas(plan).map((quota) => ({
    id: quota.id || quota.quotaId || quota.quotaCode,
    title: getQuotaTitle(quota),
    amount: getQuotaAmount(quota),
    unit: "",
    summary: getQuotaSummary(quota),
  }));
}

function QuotaChip({ item }) {
  return (
    <div className="subscription-quota-item">
      <span className="subscription-quota-icon"><Gauge size={15} /></span>
      <div className="subscription-quota-main">
        <strong>{item.title}</strong>
        <span>{item.amount} {item.unit} · {item.summary}</span>
      </div>
    </div>
  );
}

export default function SubscriptionPlanTable({
  assigningQuotaPlanId,
  defaultQuota,
  onEdit,
  onAssignDefaultQuota,
  plans,
}) {
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
    <div className="subscription-plan-card-list" role="table" aria-label="Danh sách gói dịch vụ">
      <div className="subscription-plan-list-header" role="row">
        <span>Gói dịch vụ</span>
        <span>Hiệu lực / Cập nhật</span>
        <span>Quota sử dụng</span>
        <span>Trạng thái</span>
        <span>Thao tác</span>
      </div>

      {plans.map((plan) => {
        const realQuotaItems = getRealQuotaItems(plan);
        const isAssigning = assigningQuotaPlanId === plan.id;

        return (
          <article className="subscription-plan-card" key={plan.id} role="row">
            <div className="subscription-plan-card-main" role="cell">
              <div className="subscription-plan-primary">
                <span className="subscription-plan-icon"><CreditCard size={18} /></span>
                <div>
                  <strong>{plan.planName || "Gói chưa đặt tên"}</strong>
                  <span>{formatPrice(plan.price)}</span>
                </div>
              </div>
            </div>

            <div className="subscription-plan-card-meta" role="cell">
              <span>
                <small>Hiệu lực credit</small>
                <strong>Không hết hạn</strong>
              </span>
              <span>
                <small>Cập nhật</small>
                <strong>{formatDate(plan.updatedAt || plan.createdAt)}</strong>
              </span>
            </div>

            <div className="subscription-plan-card-limits" role="cell">
              {realQuotaItems.length ? (
                <div className="subscription-quota-list" aria-label="Danh sách hạn mức thực tế khi mua gói">
                  {realQuotaItems.map((item) => (
                    <QuotaChip item={item} key={item.id} />
                  ))}
                </div>
              ) : (
                <div className="subscription-quota-empty">
                  <span>Chưa có quota thật cho gói này.</span>
                  {defaultQuota && (
                    <Button
                      className="btn-small subscription-quota-assign"
                      disabled={isAssigning}
                      onClick={() => onAssignDefaultQuota?.(plan)}
                      type="button"
                    >
                      <Plus size={15} aria-hidden="true" />
                      {isAssigning ? "Đang gán..." : "Gán 10 lượt dịch vụ"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="subscription-plan-card-status" role="cell">
              <Badge tone={plan.isActive ? "success" : "warning"}>
                {plan.isActive ? "Đang bán" : "Tạm ẩn"}
              </Badge>
            </div>

            <div className="subscription-plan-actions" role="cell">
              <Button
                className="btn-small subscription-plan-edit-button"
                onClick={() => onEdit?.(plan)}
                type="button"
              >
                <Pencil size={14} aria-hidden="true" />
                Sửa gói
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
