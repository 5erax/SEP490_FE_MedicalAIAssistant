import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Tags } from "lucide-react";
import AdminPagination from "../admin/AdminPagination";
import { useFeedback } from "../feedback/feedbackContext";
import { saleCampaignsApi, subscriptionPlansApi } from "../../services/api";
import SaleCampaignTable from "./SaleCampaignTable";
import SaleCampaignFormModal from "./SaleCampaignFormModal";
import SaleCampaignRedemptionsModal from "./SaleCampaignRedemptionsModal";
import { getCapacityErrors, loadSaleCampaignCapacity } from "./saleCampaignCapacity";

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
  const [capacity, setCapacity] = useState({});
  const [saveError, setSaveError] = useState("");
  const [openingForm, setOpeningForm] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openEdit(campaign) {
    if (openingForm) return;
    setOpeningForm(true);
    setSaveError("");
    try {
      const snapshot = await loadSaleCampaignCapacity(saleCampaignsApi, campaign.id);
      setEditing(snapshot.campaign);
      setCapacity(snapshot.capacity);
      setFormOpen(true);
    } catch (error) {
      showToast({ type: "error", title: "Không thể mở form chỉnh sửa", message: apiMessage(error, "Chưa thể kiểm tra số suất đã sử dụng. Vui lòng thử lại.") });
    } finally { setOpeningForm(false); }
  }

  async function save(payload) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      if (editing) {
        const snapshot = await loadSaleCampaignCapacity(saleCampaignsApi, editing.id);
        setCapacity(snapshot.capacity);
        const errors = getCapacityErrors(payload, snapshot.capacity);
        if (Object.keys(errors).length) {
          setSaveError("Số suất đã được cập nhật. Vui lòng điều chỉnh giới hạn trước khi lưu.");
          return;
        }
      }
      if (editing) await saleCampaignsApi.update(editing.id, payload); else await saleCampaignsApi.create(payload);
      setFormOpen(false); setEditing(null); await load(editing ? page.pageNumber : 1);
      showToast({ type: "success", title: editing ? "Đã cập nhật khuyến mãi" : "Đã tạo khuyến mãi", message: "Dữ liệu ưu đãi đã được đồng bộ." });
    } catch (error) {
      setSaveError(error?.status === 409
        ? `Không thể lưu vì dữ liệu ưu đãi đã thay đổi hoặc giới hạn mới thấp hơn số suất đã sử dụng/giữ chỗ. ${apiMessage(error, "Vui lòng kiểm tra lại giới hạn.")}`
        : apiMessage(error, "Không thể lưu khuyến mãi. Vui lòng thử lại."));
    }
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
    <header className="admin-sale-hero"><div><span><Tags size={17} />Ưu đãi dịch vụ chăm sóc</span><h2>Chương trình ưu đãi MediMate</h2><p>Thiết lập mức phí ưu đãi, lượt sử dụng tặng thêm, đối tượng áp dụng và số lượng người có thể nhận quyền lợi.</p></div><div><button type="button" onClick={() => load()}><RefreshCw size={17} />Tải lại</button><button className="primary" type="button" disabled={openingForm} onClick={() => { setEditing(null); setCapacity({}); setSaveError(""); setFormOpen(true); }}><Plus size={18} />Thêm ưu đãi</button></div></header>
    <div className="sale-campaign-summary"><strong>{page.totalCount} chương trình</strong><span>Trạng thái và số lượng quyền lợi còn lại được hệ thống cập nhật tự động.</span></div>
    {openingForm && <p role="status">Đang kiểm tra số suất đã sử dụng…</p>}
    <SaleCampaignTable campaigns={page.items} loading={loading || openingForm} onEdit={openEdit} onRedemptions={setRedemptions} onRemove={remove} onToggle={toggle} />
    <AdminPagination currentPage={page.pageNumber} totalPages={page.totalPages} loading={loading} onPageChange={load} />
    {formOpen && <SaleCampaignFormModal campaign={editing} plans={plans} saving={saving} capacity={capacity} saveError={saveError} onClose={() => { if (saving) return; setFormOpen(false); setEditing(null); }} onSave={save} />}
    {redemptions && <SaleCampaignRedemptionsModal campaign={redemptions} onClose={() => setRedemptions(null)} />}
  </section>;
}
