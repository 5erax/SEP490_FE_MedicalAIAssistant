import { useRef, useState } from "react";
import { CreditCard, Gauge, Plus, ShieldAlert, Trash2 } from "lucide-react";
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

  if (!form.planName.trim()) errors.planName = "Vui lòng nhập tên gói.";
  if (form.price === "" || Number.isNaN(price) || price < 0) {
    errors.price = "Giá gói phải là số lớn hơn hoặc bằng 0.";
  }
  if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationInDays = "Thời hạn phải là số ngày nguyên dương.";
  }

  if (form.featureLimitJson.trim()) {
    try {
      const parsed = JSON.parse(form.featureLimitJson);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        errors.featureLimitJson = "Giới hạn tính năng cần nhập theo dạng danh sách hợp lệ.";
      }
    } catch {
      errors.featureLimitJson = "Giới hạn tính năng chưa đúng định dạng.";
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

function parseFeatureLimitEntries(value) {
  try {
    const parsed = value.trim() ? JSON.parse(value) : {};
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return [];
    return Object.entries(parsed).map(([key, limit]) => ({
      key,
      limit: String(limit ?? ""),
    }));
  } catch {
    return [];
  }
}

function stringifyFeatureLimitEntries(entries) {
  const payload = entries.reduce((result, item) => {
    const key = item.key.trim();
    if (!key) return result;
    const numericValue = Number(item.limit);
    return {
      ...result,
      [key]: item.limit !== "" && !Number.isNaN(numericValue) ? numericValue : item.limit,
    };
  }, {});

  return JSON.stringify(payload, null, 2);
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
  const title = mode === "edit" ? "Cập nhật gói dịch vụ" : "Tạo gói dịch vụ";
  const featureLimitEntries = parseFeatureLimitEntries(form.featureLimitJson);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function updateFeatureLimit(index, key, value) {
    const nextEntries = featureLimitEntries.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    ));
    update("featureLimitJson", stringifyFeatureLimitEntries(nextEntries));
  }

  function addFeatureLimit() {
    update("featureLimitJson", stringifyFeatureLimitEntries([
      ...featureLimitEntries,
      { key: "", limit: "" },
    ]));
  }

  function removeFeatureLimit(index) {
    const nextEntries = featureLimitEntries.filter((_, itemIndex) => itemIndex !== index);
    update("featureLimitJson", stringifyFeatureLimitEntries(nextEntries));
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
          <p className="eyebrow">Quản lý doanh thu</p>
          <h2 id="subscription-modal-title">{title}</h2>
          <p>Cấu hình giá, thời hạn và giới hạn quyền lợi hiển thị trên trang đăng ký gói.</p>
        </div>
        <button
          ref={closeButtonRef}
          className="doctor-modal-close"
          type="button"
          aria-label="Đóng form"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <form className="clean-form subscription-plan-form" onSubmit={handleSubmit}>
        <aside className="subscription-modal-warning">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Kiểm tra giá, thời hạn và hạn mức trước khi hiển thị gói trên trang đăng ký.</span>
        </aside>

        <div className="subscription-form-sections">
          <section className="subscription-form-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><CreditCard size={20} /></span>
              <div>
                <h3>Thông tin gói</h3>
                <p>Tên, giá, thời hạn và trạng thái hiển thị của gói dịch vụ.</p>
              </div>
            </div>

            <div className="subscription-form-grid">
              <label className={`clean-field ${errors.planName ? "subscription-field-error" : ""}`}>
                <span>Tên gói</span>
                <input
                  value={form.planName}
                  onChange={(event) => update("planName", event.target.value)}
                  placeholder="Ví dụ: MediMate+ Tháng"
                  required
                  aria-invalid={errors.planName ? "true" : undefined}
                  aria-describedby={errors.planName ? "subscription-name-error" : undefined}
                />
                {errors.planName && <small id="subscription-name-error" role="alert">{errors.planName}</small>}
              </label>

              <label className={`clean-field ${errors.price ? "subscription-field-error" : ""}`}>
                <span>Giá gói (VND)</span>
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
                <span>Thời hạn (ngày)</span>
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
                <span>Trạng thái</span>
                <select value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
                  <option value="true">Đang bán</option>
                  <option value="false">Tạm ẩn</option>
                </select>
              </label>
            </div>
          </section>

          <section className="subscription-form-card subscription-limits-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><Gauge size={20} /></span>
              <div>
                <h3>Giới hạn tính năng</h3>
                <p>Thiết lập từng hạn mức sử dụng thay vì nhập JSON thủ công.</p>
              </div>
            </div>

            <div className={`subscription-limit-editor ${errors.featureLimitJson ? "subscription-field-error" : ""}`}>
              <div className="subscription-limit-editor-head">
                <span>Danh sách hạn mức</span>
                <button className="btn btn-secondary" type="button" onClick={addFeatureLimit}>
                  <Plus size={16} /> Thêm hạn mức
                </button>
              </div>

              <div className="subscription-limit-editor-list">
                {featureLimitEntries.map((item, index) => (
                  <article className="subscription-limit-editor-row" key={`${item.key}-${index}`}>
                    <label className="clean-field">
                      <span>Tính năng</span>
                      <input
                        value={item.key}
                        onChange={(event) => updateFeatureLimit(index, "key", event.target.value)}
                        placeholder="Ví dụ: symptomAnalysisPerMonth"
                      />
                    </label>
                    <label className="clean-field">
                      <span>Hạn mức</span>
                      <input
                        value={item.limit}
                        onChange={(event) => updateFeatureLimit(index, "limit", event.target.value)}
                        placeholder="Ví dụ: 30"
                      />
                    </label>
                    <button
                      className="btn subscription-limit-remove"
                      type="button"
                      onClick={() => removeFeatureLimit(index)}
                      aria-label={`Xóa hạn mức ${index + 1}`}
                    >
                      <Trash2 size={15} /> Xóa
                    </button>
                  </article>
                ))}
              </div>

              <small id="subscription-feature-help" role={errors.featureLimitJson ? "alert" : undefined}>
                {errors.featureLimitJson || "Mỗi dòng là một quyền lợi và số lượt được dùng trong gói."}
              </small>
            </div>
          </section>
        </div>

        <div className="doctor-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Tạo gói"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
