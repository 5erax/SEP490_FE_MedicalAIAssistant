import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import AdminPagination from "../admin/AdminPagination";
import { saleCampaignsApi } from "../../services/api";
import { getRedemptionDate, hasRedemptionPriceDiscount } from "../../utils/saleRedemptionPresentation";

const STATUS = { reserved: "Đang giữ suất", completed: "Đã sử dụng", released: "Đã giải phóng" };
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

export default function SaleCampaignRedemptionsModal({ campaign, onClose }) {
  const closeRef = useRef(null);
  const [state, setState] = useState({ items: [], pageNumber: 1, totalPages: 1, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    saleCampaignsApi.redemptions(campaign.id, state.pageNumber, 10).then((response) => {
      if (!active) return; const page = response?.data || {};
      setState((current) => ({ ...current, items: page.items || [], totalPages: page.totalPages || 1, loading: false }));
    }).catch(() => active && setState((current) => ({ ...current, loading: false, error: "Không thể tải lịch sử sử dụng." })));
    return () => { active = false; };
  }, [campaign.id, state.pageNumber]);

  return <Dialog backdropClassName="sale-modal-backdrop" className="sale-modal sale-redemptions-modal" labelledBy="sale-redemptions-title" onClose={onClose} initialFocusRef={closeRef}>
    <header><div><span>Lịch sử sử dụng</span><h2 id="sale-redemptions-title">{campaign.name}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
    <div className="sale-redemption-table-wrap" aria-busy={state.loading || undefined}><table><thead><tr><th>Người dùng</th><th>Gói</th><th>Giá</th><th>Credit</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
      {state.items.map((item) => {
        const date = getRedemptionDate(item);
        return <tr key={item.id}>
          <td>{item.userId}</td>
          <td>{item.planId}</td>
          <td>
            {hasRedemptionPriceDiscount(item) && <span className="pricing-original-price">{money(item.originalPrice)}</span>}
            <strong>{money(item.finalPrice)}</strong>
          </td>
          <td>{item.baseCredit} + {item.bonusCredit} = <strong>{item.grantedCredit} lượt</strong></td>
          <td>{STATUS[String(item.status).toLowerCase()] || item.status}</td>
          <td>{date ? new Date(date).toLocaleString("vi-VN") : "—"}</td>
        </tr>;
      })}
      {!state.loading && !state.items.length && <tr><td colSpan="6" className="sale-empty">Chưa có lượt sử dụng.</td></tr>}
    </tbody></table></div>
    {state.error && <p className="sale-form-error">{state.error}</p>}
    <AdminPagination currentPage={state.pageNumber} totalPages={state.totalPages} loading={state.loading} onPageChange={(pageNumber) => setState((current) => ({ ...current, pageNumber, loading: true, error: "" }))} />
  </Dialog>;
}
