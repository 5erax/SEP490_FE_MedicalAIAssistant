import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Tags } from "lucide-react";
import AdminPagination from "../admin/AdminPagination";
import { useFeedback } from "../feedback/feedbackContext";
import { saleCampaignsApi, subscriptionPlansApi } from "../../services/api";
import SaleCampaignTable from "./SaleCampaignTable";
import SaleCampaignFormModal from "./SaleCampaignFormModal";
import SaleCampaignRedemptionsModal from "./SaleCampaignRedemptionsModal";

function apiMessage(error, fallback) {
  return error?.payload?.errors?.[0] || error?.payload?.message || error?.message || fallback;
}

export default function AdminSaleCampaignsSection() {
  const { confirmAction, showToast } = useFeedback();
  const [page, setPage] = useState({ items: [], pageNumber: 1, totalPages: 1, totalCount: 0 });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [redemptions, setRedemptions] = useState(null);

  const load = useCallback(async (pageNumber = page.pageNumber) => {
    setLoading(true);
    try {
      const [campaignResponse, planResponse] = await Promise.all([
        saleCampaignsApi.list(pageNumber, 10), subscriptionPlansApi.list(),
      ]);
      const data = campaignResponse?.data || {};
      setPage({ items: data.items || [], pageNumber: data.pageNumber || pageNumber, totalPages: data.totalPages || 1, totalCount: data.totalCount || 0 });
      setPlans(Array.isArray(planResponse?.data) ? planResponse.data : planResponse?.data?.items || []);
    } catch (error) {
      showToast({ type: "error", title: "Không thể tải khuyến mãi", message: apiMessage(error, "Vui lòng thử lại.") });
    } finally { setLoading(false); }
  }, [page.pageNumber, showToast]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(payload) {
    setSaving(true);
    try {
      if (editing) await saleCampaignsApi.update(editing.id, payload); else await saleCampaignsApi.create(payload);
      setFormOpen(false); setEditing(null); await load(editing ? page.pageNumber : 1);
      showToast({ type: "success", title: editing ? "Đã cập nhật khuyến mãi" : "Đã tạo khuyến mãi", message: "Dữ liệu ưu đãi đã được đồng bộ." });
    } catch (error) { showToast({ type: "error", title: "Không thể lưu khuyến mãi", message: apiMessage(error, "Kiểm tra dữ liệu và thử lại.") }); }
    finally { setSaving(false); }
  }

  async function toggle(campaign) {
    try { await saleCampaignsApi.setStatus(campaign.id, !campaign.isActive); await load(); }
    catch (error) { showToast({ type: "error", title: "Không thể đổi trạng thái", message: apiMessage(error, "Vui lòng thử lại.") }); }
  }

  async function remove(campaign) {
    const confirmed = await confirmAction({ title: "Xóa chương trình?", message: "Chỉ chương trình chưa có lịch sử sử dụng mới có thể xóa.", confirmLabel: "Xóa", tone: "danger" });
    if (!confirmed) return;
    try { await saleCampaignsApi.remove(campaign.id); await load(); showToast({ type: "success", title: "Đã xóa chương trình", message: campaign.name }); }
    catch (error) { showToast({ type: "error", title: "Không thể xóa chương trình", message: error?.status === 409 ? "Chương trình đã có lịch sử sử dụng. Hãy tắt chương trình thay vì xóa." : apiMessage(error, "Vui lòng thử lại.") }); }
  }

  return <section className="admin-sale-campaigns admin-management-section">
    <header className="admin-sale-hero"><div><span><Tags size={17} />Khuyến mãi bán hàng</span><h2>Chương trình ưu đãi</h2><p>Quản lý giá giảm, lượt thưởng, đối tượng và số suất. Backend tự chọn ưu đãi hợp lệ cho từng khách hàng.</p></div><div><button type="button" onClick={() => load()}><RefreshCw size={17} />Tải lại</button><button className="primary" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={18} />Tạo khuyến mãi</button></div></header>
    <div className="sale-campaign-summary"><strong>{page.totalCount} chương trình</strong><span>Trạng thái và số suất được lấy trực tiếp từ hệ thống.</span></div>
    <SaleCampaignTable campaigns={page.items} loading={loading} onEdit={(campaign) => { setEditing(campaign); setFormOpen(true); }} onRedemptions={setRedemptions} onRemove={remove} onToggle={toggle} />
    <AdminPagination currentPage={page.pageNumber} totalPages={page.totalPages} loading={loading} onPageChange={load} />
    {formOpen && <SaleCampaignFormModal campaign={editing} plans={plans} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={save} />}
    {redemptions && <SaleCampaignRedemptionsModal campaign={redemptions} onClose={() => setRedemptions(null)} />}
  </section>;
}
