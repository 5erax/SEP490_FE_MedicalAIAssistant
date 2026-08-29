import { Eye, Pencil, Power, Trash2 } from "lucide-react";

const STATUS_LABELS = {
  active: "Đang diễn ra", scheduled: "Sắp diễn ra", soldout: "Đã hết suất",
  ended: "Đã kết thúc", disabled: "Đã tắt",
};
const ELIGIBILITY_LABELS = {
  all: "Tất cả khách hàng", firstPurchase: "Mua lần đầu", returningCustomer: "Đã từng mua",
};

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function dateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export default function SaleCampaignTable({ campaigns, loading, onEdit, onRedemptions, onRemove, onToggle }) {
  return (
    <div className="sale-campaign-table-wrap" aria-busy={loading || undefined}>
      <table className="sale-campaign-table">
        <thead><tr><th>Chương trình</th><th>Thời gian & đối tượng</th><th>Gói áp dụng</th><th>Sử dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          {!loading && campaigns.length === 0 && <tr><td colSpan="6" className="sale-empty">Chưa có chương trình khuyến mãi.</td></tr>}
          {campaigns.map((campaign) => {
            const status = String(campaign.displayStatus || "").toLowerCase();
            return (
              <tr key={campaign.id}>
                <td><strong>{campaign.name}</strong><span>{campaign.badgeText || "Không có nhãn"}</span><small>Ưu tiên {campaign.priority}</small></td>
                <td><span>{dateTime(campaign.startAt)} → {dateTime(campaign.endAt)}</span><small>{ELIGIBILITY_LABELS[campaign.eligibilityType] || campaign.eligibilityType}</small></td>
                <td>{(campaign.plans || []).map((plan) => <span className="sale-plan-chip" key={plan.id || plan.planId}>{plan.planName}: {plan.salePrice != null ? money(plan.salePrice) : "Giữ nguyên mức phí"}{plan.bonusCredit ? ` · tặng ${plan.bonusCredit} lượt` : ""}</span>)}</td>
                <td><strong>{campaign.occupiedRedemptions}/{campaign.maxRedemptions ?? "∞"}</strong><small>{campaign.remainingRedemptions == null ? "Không giới hạn" : `Còn ${campaign.remainingRedemptions} suất`}</small></td>
                <td><span className={`sale-status sale-status-${status}`}>{STATUS_LABELS[status] || campaign.displayStatus}</span></td>
                <td><div className="sale-row-actions">
                  <button type="button" onClick={() => onRedemptions(campaign)}><Eye size={16} />Lịch sử</button>
                  <button type="button" onClick={() => onEdit(campaign)}><Pencil size={16} />Sửa</button>
                  <button type="button" onClick={() => onToggle(campaign)}><Power size={16} />{campaign.isActive ? "Tắt" : "Bật"}</button>
                  <button className="danger" type="button" onClick={() => onRemove(campaign)}><Trash2 size={16} />Xóa</button>
                </div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
