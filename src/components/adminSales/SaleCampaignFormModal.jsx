import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "../ui/Dialog";

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function initialForm(campaign) {
  return {
    name: campaign?.name || "", description: campaign?.description || "", badgeText: campaign?.badgeText || "",
    startAt: localDateTime(campaign?.startAt), endAt: localDateTime(campaign?.endAt),
    eligibilityType: campaign?.eligibilityType || "all", maxRedemptions: campaign?.maxRedemptions ?? "",
    maxRedemptionsPerUser: campaign?.maxRedemptionsPerUser ?? "", priority: campaign?.priority ?? 0,
    isActive: campaign?.isActive ?? true,
  };
}

export default function SaleCampaignFormModal({ campaign, plans, saving, onClose, onSave }) {
  const closeRef = useRef(null);
  const [form, setForm] = useState(() => initialForm(campaign));
  const [selectedPlans, setSelectedPlans] = useState(() => new Map(
    (campaign?.plans || []).map((plan) => [plan.planId, { salePrice: plan.salePrice ?? "", bonusCredit: plan.bonusCredit || 0, isActive: plan.isActive !== false }]),
  ));
  const [error, setError] = useState("");
  const availablePlans = useMemo(() => plans.filter((plan) => Number(plan.price) > 0), [plans]);

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function togglePlan(plan) {
    setSelectedPlans((current) => {
      const next = new Map(current);
      if (next.has(plan.id)) next.delete(plan.id);
      else next.set(plan.id, { salePrice: "", bonusCredit: 0, isActive: true });
      return next;
    });
  }
  function changePlan(id, key, value) {
    setSelectedPlans((current) => {
      const next = new Map(current); next.set(id, { ...next.get(id), [key]: value }); return next;
    });
  }
  function submit(event) {
    event.preventDefault();
    const start = new Date(form.startAt); const end = new Date(form.endAt);
    if (!form.name.trim() || !form.startAt || !form.endAt) return setError("Vui lòng nhập tên và thời gian chương trình.");
    if (end <= start) return setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
    if (!selectedPlans.size) return setError("Chọn ít nhất một gói dịch vụ.");
    const campaignPlans = [...selectedPlans.entries()].map(([planId, value]) => ({
      planId, salePrice: value.salePrice === "" ? null : Number(value.salePrice), bonusCredit: Number(value.bonusCredit) || 0, isActive: value.isActive,
    }));
    const invalidPlan = campaignPlans.find((item) => {
      const plan = availablePlans.find((candidate) => candidate.id === item.planId);
      return (item.salePrice != null && (!Number.isInteger(item.salePrice) || item.salePrice <= 0 || item.salePrice >= Number(plan?.price)))
        || !Number.isInteger(item.bonusCredit) || item.bonusCredit < 0 || (item.salePrice == null && item.bonusCredit === 0);
    });
    if (invalidPlan) return setError("Mỗi gói cần có mức phí ưu đãi hợp lệ hoặc ít nhất một lượt sử dụng tặng thêm.");
    const total = form.maxRedemptions === "" ? null : Number(form.maxRedemptions);
    const perUser = form.maxRedemptionsPerUser === "" ? null : Number(form.maxRedemptionsPerUser);
    if ((total != null && (!Number.isInteger(total) || total < 1)) || (perUser != null && (!Number.isInteger(perUser) || perUser < 1)) || (total != null && perUser != null && perUser > total)) return setError("Giới hạn lượt sử dụng chưa hợp lệ.");
    setError("");
    onSave({ ...form, name: form.name.trim(), description: form.description.trim(), badgeText: form.badgeText.trim(), startAt: start.toISOString(), endAt: end.toISOString(), maxRedemptions: total, maxRedemptionsPerUser: perUser, priority: Number(form.priority), plans: campaignPlans });
  }

  return <Dialog backdropClassName="sale-modal-backdrop" className="sale-modal" labelledBy="sale-form-title" onClose={onClose} initialFocusRef={closeRef}>
    <header><div><span>{campaign ? "Cập nhật quyền lợi" : "Chương trình mới"}</span><h2 id="sale-form-title">{campaign?.name || "Tạo chương trình ưu đãi"}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
    <form onSubmit={submit}>
      <div className="sale-form-grid">
        <label>Tên chương trình<input value={form.name} onChange={(e) => change("name", e.target.value)} /></label>
        <label>Nhãn hiển thị<input value={form.badgeText} onChange={(e) => change("badgeText", e.target.value)} placeholder="HEALTH WEEK" /></label>
        <label className="wide">Mô tả<textarea value={form.description} onChange={(e) => change("description", e.target.value)} /></label>
        <label>Bắt đầu<input type="datetime-local" value={form.startAt} onChange={(e) => change("startAt", e.target.value)} /></label>
        <label>Kết thúc<input type="datetime-local" value={form.endAt} onChange={(e) => change("endAt", e.target.value)} /></label>
        <label>Đối tượng<select value={form.eligibilityType} onChange={(e) => change("eligibilityType", e.target.value)}><option value="all">Tất cả khách hàng</option><option value="firstPurchase">Mua lần đầu</option><option value="returningCustomer">Đã từng mua</option></select></label>
        <label>Ưu tiên<input type="number" min="0" max="1000" value={form.priority} onChange={(e) => change("priority", e.target.value)} /></label>
        <label>Tổng suất<input type="number" min="1" value={form.maxRedemptions} onChange={(e) => change("maxRedemptions", e.target.value)} placeholder="Không giới hạn" /></label>
        <label>Suất mỗi người<input type="number" min="1" value={form.maxRedemptionsPerUser} onChange={(e) => change("maxRedemptionsPerUser", e.target.value)} placeholder="Không giới hạn" /></label>
      </div>
      <fieldset className="sale-plan-editor"><legend>Gói dịch vụ áp dụng</legend>{availablePlans.map((plan) => { const value = selectedPlans.get(plan.id); return <div className="sale-plan-editor-row" key={plan.id}><label className="sale-plan-check"><input type="checkbox" checked={Boolean(value)} onChange={() => togglePlan(plan)} /><span><strong>{plan.planName}</strong><small>Mức phí thông thường {Number(plan.price).toLocaleString("vi-VN")} ₫</small></span></label>{value && <><label>Mức phí ưu đãi<input type="number" min="1" value={value.salePrice} onChange={(e) => changePlan(plan.id, "salePrice", e.target.value)} /></label><label>Lượt tặng thêm<input type="number" min="0" value={value.bonusCredit} onChange={(e) => changePlan(plan.id, "bonusCredit", e.target.value)} /></label></>}</div>; })}</fieldset>
      {error && <p className="sale-form-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Hủy</button><button className="primary" type="submit" disabled={saving}>{saving ? "Đang lưu…" : campaign ? "Lưu thay đổi" : "Tạo ưu đãi"}</button></footer>
    </form>
  </Dialog>;
}
