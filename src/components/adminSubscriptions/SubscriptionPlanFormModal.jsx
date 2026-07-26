import { useRef, useState } from "react";
import { CreditCard, Gauge, ShieldAlert } from "lucide-react";
import { Dialog } from "../ui";

const DEFAULT_FEATURE_LIMITS = `{
  "symptomAnalysisPerMonth": 30,
  "aiChatPerDay": 20
}`;

const EMPTY_FORM = {
  planName: "",
  price: "",
  durationInDays: "30",
  featureLimitJson: DEFAULT_FEATURE_LIMITS,
  isActive: "true",
};

function formatFeatureLimits(value) {
  if (!value) return DEFAULT_FEATURE_LIMITS;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function toFormValue(plan) {
  if (!plan) return EMPTY_FORM;
  return {
    planName: plan.planName ?? "",
    price: plan.price ?? "",
    durationInDays: plan.durationInDays ?? "",
    featureLimitJson: formatFeatureLimits(plan.featureLimitJson),
    isActive: String(Boolean(plan.isActive)),
  };
}

function validate(form) {
  const errors = {};
  const price = Number(form.price);
  const duration = Number(form.durationInDays);

  if (!form.planName.trim()) errors.planName = "Vui long nhap ten goi.";
  if (form.price === "" || Number.isNaN(price) || price < 0) {
    errors.price = "Gia goi phai la so lon hon hoac bang 0.";
  }
  if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationInDays = "Thoi han phai la so ngay nguyen duong.";
  }

  if (form.featureLimitJson.trim()) {
    try {
      const parsed = JSON.parse(form.featureLimitJson);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        errors.featureLimitJson = "Gioi han tinh nang can nhap theo dang danh sach hop le.";
      }
    } catch {
      errors.featureLimitJson = "Gioi han tinh nang chua dung dinh dang.";
    }
  }

  return errors;
}

function buildPayload(form) {
  return {
    planName: form.planName.trim(),
    price: Number(form.price),
    durationInDays: Number(form.durationInDays),
    featureLimitJson: form.featureLimitJson.trim()
      ? JSON.stringify(JSON.parse(form.featureLimitJson))
      : null,
    isActive: form.isActive === "true",
  };
}

export default function SubscriptionPlanFormModal({
  mode,
  plan,
  saving,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValue(plan));
  const [errors, setErrors] = useState({});
  const closeButtonRef = useRef(null);
  const title = mode === "edit" ? "Cap nhat goi dich vu" : "Tao goi dich vu";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(buildPayload(form));
  }

  return (
    <Dialog
      backdropClassName="subscription-modal-backdrop"
      className="subscription-modal"
      labelledBy="subscription-modal-title"
      onClose={onClose}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      initialFocusRef={closeButtonRef}
      restoreFocusRef={restoreFocusRef}
    >
      <header className="subscription-modal-header">
        <span className="subscription-modal-icon" aria-hidden="true">
          <CreditCard size={22} />
        </span>
        <div>
          <p className="eyebrow">Quan ly doanh thu</p>
          <h2 id="subscription-modal-title">{title}</h2>
          <p>Cau hinh gia, thoi han va gioi han quyen loi hien thi tren trang dang ky goi.</p>
        </div>
        <button ref={closeButtonRef} className="doctor-modal-close" type="button" aria-label="Dong form" onClick={onClose}>×</button>
      </header>

      <form className="clean-form subscription-plan-form" onSubmit={handleSubmit}>
        <aside className="subscription-modal-warning">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Kiem tra gia, thoi han va han muc truoc khi hien thi goi tren trang dang ky.</span>
        </aside>

        <div className="subscription-form-sections">
          <section className="subscription-form-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><CreditCard size={20} /></span>
              <div>
                <h3>Thong tin goi</h3>
                <p>Ten, gia, thoi han va trang thai hien thi cua goi dich vu.</p>
              </div>
            </div>

            <div className="subscription-form-grid">
              <label className={`clean-field ${errors.planName ? "subscription-field-error" : ""}`}>
                <span>Ten goi</span>
                <input
                  value={form.planName}
                  onChange={(event) => update("planName", event.target.value)}
                  placeholder="Vi du: MediMate+ Thang"
                  required
                  aria-invalid={errors.planName ? "true" : undefined}
                  aria-describedby={errors.planName ? "subscription-name-error" : undefined}
                />
                {errors.planName && <small id="subscription-name-error" role="alert">{errors.planName}</small>}
              </label>

              <label className={`clean-field ${errors.price ? "subscription-field-error" : ""}`}>
                <span>Gia goi (VND)</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="149000"
                  required
                  aria-invalid={errors.price ? "true" : undefined}
                  aria-describedby={errors.price ? "subscription-price-error" : undefined}
                />
                {errors.price && <small id="subscription-price-error" role="alert">{errors.price}</small>}
              </label>

              <label className={`clean-field subscription-duration-inline ${errors.durationInDays ? "subscription-field-error" : ""}`}>
                <span>Thoi han (ngay)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.durationInDays}
                  onChange={(event) => update("durationInDays", event.target.value)}
                  required
                  aria-invalid={errors.durationInDays ? "true" : undefined}
                  aria-describedby={errors.durationInDays ? "subscription-duration-error" : undefined}
                />
                {errors.durationInDays && <small id="subscription-duration-error" role="alert">{errors.durationInDays}</small>}
              </label>

              <label className="clean-field">
                <span>Trang thai</span>
                <select value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
                  <option value="true">Dang ban</option>
                  <option value="false">Tam an</option>
                </select>
              </label>
            </div>
          </section>

          <section className="subscription-form-card subscription-limits-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><Gauge size={20} /></span>
              <div>
                <h3>Gioi han tinh nang</h3>
                <p>Cau hinh han muc su dung cho tung quyen loi trong goi.</p>
              </div>
            </div>

            <label className={`clean-field ${errors.featureLimitJson ? "subscription-field-error" : ""}`}>
              <span>Gioi han tinh nang</span>
              <textarea
                rows={8}
                spellCheck="false"
                value={form.featureLimitJson}
                onChange={(event) => update("featureLimitJson", event.target.value)}
                aria-invalid={errors.featureLimitJson ? "true" : undefined}
                aria-describedby="subscription-feature-help"
              />
              <small id="subscription-feature-help" role={errors.featureLimitJson ? "alert" : undefined}>
                {errors.featureLimitJson || "Nhap cac han muc theo tung tinh nang, vi du so luot dung moi thang."}
              </small>
            </label>
          </section>
        </div>

        <div className="doctor-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Huy</button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Dang luu..." : mode === "edit" ? "Luu cap nhat" : "Tao goi"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
