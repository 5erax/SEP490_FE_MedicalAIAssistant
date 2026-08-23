import { useRef, useState } from "react";
import { Check, CreditCard, Gauge, ShieldAlert } from "lucide-react";
import { focusFirstInvalidField, getAdminFieldProps } from "../admin/adminFormUtils";
import { Dialog } from "../ui";

const EMPTY_FORM = {
  planName: "",
  price: "",
  durationInDays: "30",
  isActive: "true",
};

const DEFAULT_QUOTA_LIMIT = "10";
const DEFAULT_QUOTA_RESET_PERIOD = "subscriptionCycle";

function toFormValue(plan) {
  if (!plan) return EMPTY_FORM;
  return {
    planName: plan.planName ?? "",
    price: plan.price ?? "",
    durationInDays: plan.durationInDays ?? "",
    isActive: String(Boolean(plan.isActive)),
  };
}

function validate(form) {
  const errors = {};
  const price = Number(form.price);

  if (!form.planName.trim()) errors.planName = "Vui lòng nhập tên gói.";
  if (form.price === "" || Number.isNaN(price) || price < 0) {
    errors.price = "Giá gói phải là số lớn hơn hoặc bằng 0.";
  }

  return errors;
}

// featureLimitJson isn't editable here anymore - it was never an enforced
// limit, just marketing copy. Pass the plan's existing value through
// unchanged so it doesn't regress the sales chatbot prompt that still reads it.
function buildPayload(form, existingFeatureLimitJson) {
  return {
    planName: form.planName.trim(),
    price: Number(form.price),
    durationInDays: Number(form.durationInDays),
    featureLimitJson: existingFeatureLimitJson ?? null,
    isActive: form.isActive === "true",
  };
}

function getQuotaCode(quota) {
  return quota?.quotaCode || quota?.code || "";
}

function getQuotaTitle(quota) {
  return quota?.quotaName || quota?.name || getQuotaCode(quota) || "Hạn mức sử dụng";
}

function getQuotaUnit(quota) {
  return String(getQuotaCode(quota)).toUpperCase() === "SERVICE_CREDIT" ? "lượt" : (quota?.unit || "lượt");
}

function findCatalogQuota(row, quotaCatalog) {
  const rowCode = String(row.quotaCode || "").toUpperCase();
  return quotaCatalog.find((quota) => String(getQuotaCode(quota)).toUpperCase() === rowCode);
}

function getQuotaRows(plan, defaultQuota) {
  const planQuotas = Array.isArray(plan?.quotas) ? plan.quotas : [];
  const rows = planQuotas.map((quota) => ({
    quotaId: quota.quotaId || quota.quotaDefinitionId || "",
    quotaCode: getQuotaCode(quota),
    name: getQuotaTitle(quota),
    unit: getQuotaUnit(quota),
    limitValue: String(quota.limitValue ?? ""),
    resetPeriod: quota.resetPeriod || DEFAULT_QUOTA_RESET_PERIOD,
    isActive: quota.isActive !== false,
  }));

  if (!rows.length && defaultQuota?.id) {
    rows.push({
      quotaId: defaultQuota.id,
      quotaCode: defaultQuota.code || "",
      name: getQuotaTitle(defaultQuota),
      unit: getQuotaUnit(defaultQuota),
      limitValue: DEFAULT_QUOTA_LIMIT,
      resetPeriod: DEFAULT_QUOTA_RESET_PERIOD,
      isActive: true,
    });
  }

  return rows;
}

function buildQuotaUpdates(rows, quotaCatalog) {
  return rows
    .map((row) => {
      const catalogQuota = findCatalogQuota(row, quotaCatalog);
      return {
        quotaId: catalogQuota?.id || row.quotaId,
        limitValue: Number(row.limitValue),
        resetPeriod: row.resetPeriod || DEFAULT_QUOTA_RESET_PERIOD,
        isActive: row.isActive !== false,
      };
    })
    .filter((row) => row.quotaId && Number.isFinite(row.limitValue) && row.limitValue >= 0);
}

export default function SubscriptionPlanFormModal({
  mode,
  plan,
  saving,
  quotaCatalog = [],
  defaultQuota,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormValue(plan));
  const [quotaRows, setQuotaRows] = useState(() => getQuotaRows(plan, defaultQuota));
  const [errors, setErrors] = useState({});
  const closeButtonRef = useRef(null);
  const formRef = useRef(null);
  const title = mode === "edit" ? "Cập nhật gói dịch vụ" : "Tạo gói dịch vụ";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function updateQuotaRow(index, key, value) {
    setQuotaRows((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
    setErrors((current) => ({ ...current, quotaRows: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (quotaRows.some((row) => {
      const limit = Number(row.limitValue);
      return row.limitValue === "" || !Number.isFinite(limit) || limit < 0;
    })) {
      nextErrors.quotaRows = "Số lượt hạn mức phải là số không âm.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField(formRef, nextErrors);
      return;
    }
    onSubmit(buildPayload(form, plan?.featureLimitJson), {
      quotaUpdates: buildQuotaUpdates(quotaRows, quotaCatalog),
    });
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
          <p className="eyebrow">Quản lý gói dịch vụ</p>
          <h2 id="subscription-modal-title">{title}</h2>
          <p>Cấu hình giá và số lượt dịch vụ dùng chung hiển thị trên trang mua gói.</p>
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

      <form ref={formRef} className="clean-form subscription-plan-form" onSubmit={handleSubmit} noValidate>
        <aside className="subscription-modal-warning">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Kiểm tra giá và hạn mức SERVICE_CREDIT trước khi mở bán. Credit đã mua không hết hạn.</span>
        </aside>

        <div className="subscription-form-sections">
          <section className="subscription-form-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><CreditCard size={20} /></span>
              <div>
                <h3>Thông tin gói</h3>
                <p>Tên, giá và trạng thái hiển thị của gói dịch vụ.</p>
              </div>
            </div>

            <div className="subscription-form-grid">
              <label className={`clean-field ${errors.planName ? "subscription-field-error" : ""}`}>
                <span>Tên gói</span>
                <input
                  {...getAdminFieldProps("planName", errors.planName, errors.planName ? "subscription-name-error" : "")}
                  value={form.planName}
                  onChange={(event) => update("planName", event.target.value)}
                  placeholder="Ví dụ: Gói 10 lượt"
                  required
                />
                {errors.planName && <small id="subscription-name-error" role="alert">{errors.planName}</small>}
              </label>

              <label className={`clean-field ${errors.price ? "subscription-field-error" : ""}`}>
                <span>Giá gói (VND)</span>
                <input
                  {...getAdminFieldProps("price", errors.price, errors.price ? "subscription-price-error" : "")}
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="149000"
                  required
                />
                {errors.price && <small id="subscription-price-error" role="alert">{errors.price}</small>}
              </label>

              <label className="clean-field subscription-status-field">
                <span>Trạng thái</span>
                <span className="subscription-status-toggle">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={form.isActive === "true"}
                    checked={form.isActive === "true"}
                    onChange={(event) => update("isActive", event.target.checked ? "true" : "false")}
                  />
                  <span className="subscription-status-toggle-track" aria-hidden="true">
                    <span className="subscription-status-toggle-thumb" />
                  </span>
                  <span className="subscription-status-toggle-text">
                    {form.isActive === "true" ? "Đang bán" : "Tạm ẩn"}
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="subscription-form-card subscription-real-quota-card">
            <div className="subscription-form-card-head">
              <span aria-hidden="true"><Gauge size={20} /></span>
              <div>
                <h3>Lượt sử dụng thực tế</h3>
                <p>Số lượt hệ thống ghi nhận cho gói này.</p>
              </div>
            </div>

            <div
              className={`subscription-real-quota-list ${errors.quotaRows ? "subscription-field-error" : ""}`}
              data-error-field="quotaRows"
              tabIndex={errors.quotaRows ? -1 : undefined}
              aria-invalid={errors.quotaRows ? "true" : undefined}
              aria-describedby="subscription-quota-help"
            >
              {quotaRows.length > 0 && (
                <div className="subscription-real-quota-summary" aria-label="Hạn mức đang áp dụng">
                  {quotaRows.map((row, index) => (
                    <span key={`${row.quotaCode || row.quotaId}-summary-${index}`}>
                      <strong>{row.name}</strong>
                      {row.limitValue || 0} {row.unit || "lượt"} · không hết hạn
                    </span>
                  ))}
                </div>
              )}
              {quotaRows.length ? quotaRows.map((row, index) => (
                <article className="subscription-real-quota-row" key={`${row.quotaCode || row.quotaId}-${index}`}>
                  <div className="subscription-real-quota-name">
                    <span>Hạn mức</span>
                    <strong>{row.name}</strong>
                    <small>{row.unit} · dùng chung, không hết hạn</small>
                  </div>
                  <label className="clean-field">
                    <span>Số lượt</span>
                    <input
                      name={`quota.${index}.limitValue`}
                      type="number"
                      min="0"
                      step="1"
                      value={row.limitValue}
                      onChange={(event) => updateQuotaRow(index, "limitValue", event.target.value)}
                      placeholder="Ví dụ: 3"
                    />
                  </label>
                </article>
              )) : (
                <p className="subscription-quota-modal-empty">Chưa có hạn mức khả dụng cho gói này.</p>
              )}
              <small id="subscription-quota-help" role={errors.quotaRows ? "alert" : undefined}>
                {errors.quotaRows || "Hạn mức sẽ được lưu cùng lần cập nhật gói."}
              </small>
            </div>
          </section>
        </div>

        <div className="doctor-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Check size={16} aria-hidden="true" />
            {saving ? "Đang lưu..." : mode === "edit" ? "Lưu cập nhật" : "Tạo gói"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
