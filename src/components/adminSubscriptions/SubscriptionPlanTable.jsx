import { Badge, Button, EmptyState } from "../ui";
import { CreditCard, Gauge, Pencil, Plus, WalletCards } from "lucide-react";

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

function getQuotaCode(quota) {
  return quota.quotaCode || quota.code;
}

function getQuotaTitle(quota) {
  const code = getQuotaCode(quota);
  return QUOTA_LABELS[code] || quota.quotaName || quota.name || code || "Hạn mức";
}

function getQuotaSummary(quota) {
  const code = getQuotaCode(quota);
  if (code === "SERVICE_CREDIT") return "Dùng chung cho 3 dịch vụ";
  if (code === "RECOVERY_PLAN_REQUEST") return "Mỗi chu kỳ gói";
  return getResetPeriodLabel(quota.resetPeriod);
}

function getQuotaDetail(quota) {
  const code = getQuotaCode(quota);
  if (code === "SERVICE_CREDIT") return "Kế hoạch phục hồi, tư vấn trước khám, phân tích xét nghiệm";
  return getResetPeriodLabel(quota.resetPeriod);
}

function getQuotaAmount(quota) {
  const limit = Number(quota.limitValue || 0).toLocaleString("vi-VN");
  const code = getQuotaCode(quota);
  return `${limit} ${code === "SERVICE_CREDIT" ? "lượt dùng" : (quota.unit || "lượt")}`;
}

function getRealQuotaItems(plan) {
  return getPlanQuotas(plan).map((quota) => ({
    id: quota.id || quota.quotaId || quota.quotaCode,
    title: getQuotaTitle(quota),
    amount: getQuotaAmount(quota),
    summary: getQuotaSummary(quota),
    detail: getQuotaDetail(quota),
  }));
}

function QuotaChip({ item }) {
  return (
    <div className="subscription-quota-item">
      <span className="subscription-quota-icon" aria-hidden="true"><Gauge size={15} /></span>
      <div className="subscription-quota-main">
        <small>{item.title}</small>
        <strong>{item.amount}</strong>
        <span>{item.summary}</span>
        <em>{item.detail}</em>
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
        <span>Quota sử dụng</span>
        <span>Cập nhật</span>
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
                <span className="subscription-plan-icon" aria-hidden="true"><WalletCards size={20} /></span>
                <div>
                  <strong>{plan.planName || "Gói chưa đặt tên"}</strong>
                  <span>{formatPrice(plan.price)}</span>
                </div>
              </div>
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

            <div className="subscription-plan-card-meta subscription-plan-card-updated" role="cell">
              <small>Cập nhật gần nhất</small>
              <strong>{formatDate(plan.updatedAt || plan.createdAt)}</strong>
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
                Sửa
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
