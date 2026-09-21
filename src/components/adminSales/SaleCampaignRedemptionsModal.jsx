import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import AdminPagination from "../admin/AdminPagination";
import { saleCampaignsApi, usersApi } from "../../services/api";
import { getRedemptionDate, hasRedemptionPriceDiscount } from "../../utils/saleRedemptionPresentation";

const STATUS = { reserved: "Đang giữ suất", completed: "Đã sử dụng", released: "Đã giải phóng" };
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}\u00a0đ`;

function displayUserName(item, usersById) {
  const directName = item.userDisplayName || item.userFullName || item.fullName || item.displayName || item.userName || item.username || item.email;
  if (directName) return directName;
  const user = usersById.get(item.userId);
  return user?.displayName || user?.fullName || user?.name || user?.userName || user?.username || user?.email || "Người dùng chưa xác định";
}

function displayPlanName(item, plansById) {
  const directName = item.planName || item.subscriptionPlanName || item.packageName;
  if (directName) return directName;
  const plan = plansById.get(item.planId);
  return plan?.planName || plan?.name || "Gói chưa xác định";
}

function addUserToMap(map, user) {
  [user.id, user.userId, user.identityId].filter(Boolean).forEach((id) => map.set(id, user));
}

async function loadUsersById() {
  const pageSize = 100;
  const firstResponse = await usersApi.list(1, pageSize);
  const firstPage = firstResponse?.data || {};
  const users = [...(firstPage.items || [])];
  const totalPages = firstPage.totalPages || 1;
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    const response = await usersApi.list(pageNumber, pageSize);
    users.push(...(response?.data?.items || []));
  }
  const usersById = new Map();
  users.forEach((user) => addUserToMap(usersById, user));
  return usersById;
}

export default function SaleCampaignRedemptionsModal({ campaign, plans = [], onClose }) {
  const closeRef = useRef(null);
  const [state, setState] = useState({ items: [], pageNumber: 1, totalPages: 1, loading: true, error: "" });
  const [usersById, setUsersById] = useState(new Map());
  const plansById = new Map([...(campaign.plans || []), ...plans].flatMap((plan) => [
    [plan.id, plan],
    [plan.planId, plan],
  ].filter(([id]) => Boolean(id))));

  useEffect(() => {
    let active = true;
    loadUsersById().then((userMap) => {
      if (active) setUsersById(userMap);
    }).catch(() => {
      if (active) setState((current) => ({ ...current, error: "Không thể tải tên người dùng. Vui lòng thử lại." }));
    });
    return () => { active = false; };
  }, []);

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
          <td><strong>{displayUserName(item, usersById)}</strong></td>
          <td><strong>{displayPlanName(item, plansById)}</strong></td>
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
