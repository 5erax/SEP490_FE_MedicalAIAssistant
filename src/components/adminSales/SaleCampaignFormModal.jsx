import { useMemo, useRef, useState } from "react";
import { BadgePercent, CalendarClock, Check, CreditCard, Megaphone, Settings2, ShieldAlert, Tags, Users, X } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { getCapacityErrors } from "./saleCampaignCapacity";

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
    maxRedemptionsPerUser: campaign?.eligibilityType === "firstPurchase" ? 1 : campaign?.maxRedemptionsPerUser ?? "", priority: campaign?.priority ?? 0,
    isActive: campaign?.isActive ?? true,
    announceToUsers: campaign?.announceToUsers ?? false,
  };
}

export default function SaleCampaignFormModal({ campaign, plans, saving, capacity, saveError, onClose, onSave }) {
  const closeRef = useRef(null);
  const [form, setForm] = useState(() => initialForm(campaign));
  const [selectedPlans, setSelectedPlans] = useState(() => new Map(
    (campaign?.plans || []).map((plan) => [plan.planId, { salePrice: plan.salePrice ?? "", bonusCredit: plan.bonusCredit || 0, isActive: plan.isActive !== false }]),
  ));
  const [error, setError] = useState("");
  const capacityErrors = getCapacityErrors(form, capacity);
  const hasCapacityErrors = Object.keys(capacityErrors).length > 0;
  const availablePlans = useMemo(() => plans.filter((plan) => Number(plan.price) > 0), [plans]);
  const isFirstPurchase = form.eligibilityType === "firstPurchase";

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function changeEligibilityType(value) {
    setForm((current) => ({
      ...current,
      eligibilityType: value,
      maxRedemptionsPerUser: value === "firstPurchase" ? 1 : current.maxRedemptionsPerUser,
    }));
  }
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
    if (saving || hasCapacityErrors) return;
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
    if (form.eligibilityType === "firstPurchase" && perUser !== 1) return setError("Ưu đãi mua lần đầu chỉ cho phép 1 suất mỗi người.");
    if ((total != null && (!Number.isInteger(total) || total < 1)) || (perUser != null && (!Number.isInteger(perUser) || perUser < 1)) || (total != null && perUser != null && perUser > total)) return setError("Giới hạn lượt sử dụng chưa hợp lệ.");
    setError("");
    onSave({ ...form, name: form.name.trim(), description: form.description.trim(), badgeText: form.badgeText.trim(), startAt: start.toISOString(), endAt: end.toISOString(), maxRedemptions: total, maxRedemptionsPerUser: perUser, priority: Number(form.priority), plans: campaignPlans });
  }

  return <Dialog backdropClassName="sale-modal-backdrop" className="sale-modal sale-campaign-form-modal" labelledBy="sale-form-title" onClose={onClose} initialFocusRef={closeRef}>
    <header className="sale-modal-header">
      <span className="sale-modal-icon" aria-hidden="true"><BadgePercent size={22} /></span>
      <div>
        <p className="eyebrow">{campaign ? "Cập nhật quyền lợi" : "Chương trình mới"}</p>
        <h2 id="sale-form-title">{campaign?.name || "Tạo chương trình ưu đãi"}</h2>
        <p>Thiết lập thời gian, đối tượng, số suất và quyền lợi áp dụng cho từng gói dịch vụ.</p>
      </div>
      <button ref={closeRef} className="doctor-modal-close" type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><X size={20} aria-hidden="true" /></button>
    </header>

    <form className="sale-campaign-form" onSubmit={submit}>
      <aside className="sale-modal-warning">
        <ShieldAlert size={18} aria-hidden="true" />
        <span>Kiểm tra thời gian, số suất còn lại và giá ưu đãi trước khi mở chương trình.</span>
      </aside>

      <div className="sale-form-sections">
        <section className="sale-form-card">
          <div className="sale-form-card-head">
            <span aria-hidden="true"><Tags size={20} /></span>
            <div>
              <h3>Thông tin chương trình</h3>
              <p>Tên, nhãn hiển thị và mô tả nội bộ của ưu đãi.</p>
            </div>
          </div>
          <div className="sale-form-grid">
            <label className="clean-field"><span>Tên chương trình</span><input value={form.name} onChange={(e) => change("name", e.target.value)} /></label>
            <label className="clean-field"><span>Nhãn hiển thị</span><input value={form.badgeText} onChange={(e) => change("badgeText", e.target.value)} placeholder="HEALTH WEEK" /></label>
            <label className="clean-field wide"><span>Mô tả</span><textarea value={form.description} onChange={(e) => change("description", e.target.value)} /></label>
          </div>
        </section>

        <section className="sale-form-card">
          <div className="sale-form-card-head">
            <span aria-hidden="true"><CalendarClock size={20} /></span>
            <div>
              <h3>Hiệu lực và đối tượng</h3>
              <p>Khoảng thời gian áp dụng, nhóm khách hàng và thứ tự ưu tiên khi có nhiều ưu đãi.</p>
            </div>
          </div>
          <div className="sale-form-grid">
            <label className="clean-field"><span>Bắt đầu</span><input type="datetime-local" value={form.startAt} onChange={(e) => change("startAt", e.target.value)} /></label>
            <label className="clean-field"><span>Kết thúc</span><input type="datetime-local" value={form.endAt} onChange={(e) => change("endAt", e.target.value)} /></label>
            <label className="clean-field"><span>Đối tượng</span><select value={form.eligibilityType} onChange={(e) => changeEligibilityType(e.target.value)}><option value="all">Tất cả khách hàng</option><option value="firstPurchase">Mua lần đầu</option><option value="returningCustomer">Đã từng mua</option></select></label>
            <label className="clean-field"><span>Ưu tiên</span><input type="number" min="0" max="1000" value={form.priority} onChange={(e) => change("priority", e.target.value)} /></label>
          </div>
        </section>

        <section className="sale-form-card">
          <div className="sale-form-card-head">
            <span aria-hidden="true"><Users size={20} /></span>
            <div>
              <h3>Giới hạn sử dụng</h3>
              <p>Quản lý tổng số suất và số suất tối đa cho mỗi người dùng.</p>
            </div>
          </div>
          <div className="sale-form-grid">
            <label className="clean-field"><span>Tổng suất</span><input type="number" min={Math.max(1, capacity?.occupiedRedemptions || 0)} step="1" value={form.maxRedemptions} onChange={(e) => change("maxRedemptions", e.target.value)} placeholder="Không giới hạn" aria-invalid={Boolean(capacityErrors.maxRedemptions)} aria-describedby="sale-total-capacity" /><small id="sale-total-capacity" className={capacityErrors.maxRedemptions ? "sale-form-error" : ""} aria-live="polite">{capacityErrors.maxRedemptions || `Đã sử dụng hoặc giữ chỗ: ${capacity?.occupiedRedemptions || 0} suất. Để trống nếu không giới hạn.`}</small></label>
            <label className="clean-field"><span>Suất mỗi người</span><input type="number" min={isFirstPurchase ? 1 : Math.max(1, capacity?.maxOccupiedPerUser || 0)} max={isFirstPurchase ? 1 : undefined} step="1" value={isFirstPurchase ? 1 : form.maxRedemptionsPerUser} onChange={(e) => change("maxRedemptionsPerUser", e.target.value)} placeholder="Không giới hạn" disabled={isFirstPurchase} aria-invalid={Boolean(capacityErrors.maxRedemptionsPerUser)} aria-describedby="sale-user-capacity" /><small id="sale-user-capacity" className={capacityErrors.maxRedemptionsPerUser ? "sale-form-error" : ""} aria-live="polite">{capacityErrors.maxRedemptionsPerUser || (isFirstPurchase ? "Mua lần đầu chỉ được dùng 1 suất mỗi người." : `Mức sử dụng cao nhất mỗi người: ${capacity?.maxOccupiedPerUser || 0} suất. Để trống nếu không giới hạn.`)}</small></label>
          </div>
        </section>

        <section className="sale-form-card">
          <div className="sale-form-card-head">
            <span aria-hidden="true"><CreditCard size={20} /></span>
            <div>
              <h3>Gói dịch vụ áp dụng</h3>
              <p>Chọn gói, nhập mức phí ưu đãi hoặc số lượt tặng thêm cho từng gói.</p>
            </div>
          </div>
          <fieldset className="sale-plan-editor">
            <legend>Gói dịch vụ áp dụng</legend>
            {availablePlans.map((plan) => {
              const value = selectedPlans.get(plan.id);
              return <div className="sale-plan-editor-row" key={plan.id}>
                <label className="sale-plan-check"><input type="checkbox" checked={Boolean(value)} onChange={() => togglePlan(plan)} /><span><strong>{plan.planName}</strong><small>Mức phí thông thường {Number(plan.price).toLocaleString("vi-VN")}&nbsp;đ</small></span></label>
                {value && <>
                  <label className="clean-field"><span>Mức phí ưu đãi</span><input type="number" min="1" value={value.salePrice} onChange={(e) => changePlan(plan.id, "salePrice", e.target.value)} /></label>
                  <label className="clean-field"><span>Lượt tặng thêm</span><input type="number" min="0" value={value.bonusCredit} onChange={(e) => changePlan(plan.id, "bonusCredit", e.target.value)} /></label>
                </>}
              </div>;
            })}
          </fieldset>
        </section>

        <section className="sale-form-card">
          <div className="sale-form-card-head">
            <span aria-hidden="true"><Settings2 size={20} /></span>
            <div>
              <h3>Trạng thái chương trình</h3>
              <p>Bật/tắt chương trình và thông báo ưu đãi cho người dùng đủ điều kiện.</p>
            </div>
          </div>
          <fieldset className="sale-campaign-settings">
            <legend>Trạng thái chương trình</legend>
            <label className="sale-campaign-toggle">
              <input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => change("isActive", event.target.checked)} />
              <span className="sale-campaign-toggle-control" aria-hidden="true"><span /></span>
              <span><strong>Kích hoạt chương trình</strong><small>Cho phép chương trình được áp dụng trên bảng giá và khi thanh toán trong thời gian hiệu lực.</small></span>
            </label>
            <label className="sale-campaign-toggle">
              <input type="checkbox" checked={Boolean(form.announceToUsers)} onChange={(event) => change("announceToUsers", event.target.checked)} />
              <span className="sale-campaign-toggle-control" aria-hidden="true"><span /></span>
              <span><strong>Gửi thông báo ưu đãi</strong><small>Tự động gửi Email và Mobile Push cho người dùng đủ điều kiện khi chương trình thực sự khả dụng.</small></span>
            </label>
            {form.announceToUsers && !form.isActive && <p><Megaphone size={14} aria-hidden="true" /> Thông báo chỉ được gửi khi chương trình đang hoạt động. Hai lựa chọn này được lưu độc lập.</p>}
            {form.announceToUsers && <p><Megaphone size={14} aria-hidden="true" /> Thông báo không được gửi ngay khi lưu. Hệ thống sẽ tự động xét điều kiện, mức ưu tiên và số suất còn lại.</p>}
          </fieldset>
        </section>
      </div>

      {error && <p className="sale-form-error" role="alert">{error}</p>}
      {saveError && <p className="sale-form-error" role="alert">{saveError}</p>}
      <footer><button type="button" onClick={onClose} disabled={saving}>Hủy</button><button className="primary" type="submit" disabled={saving || hasCapacityErrors}><Check size={16} aria-hidden="true" />{saving ? "Đang kiểm tra và lưu…" : campaign ? "Lưu thay đổi" : "Tạo ưu đãi"}</button></footer>
    </form>
  </Dialog>;
}
