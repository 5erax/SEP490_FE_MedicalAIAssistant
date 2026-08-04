import { useRef, useState } from "react";
import { Check, CreditCard, Gauge, ShieldAlert } from "lucide-react";
import { focusFirstInvalidField, getAdminFieldProps } from "../admin/adminFormUtils";
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

const FEATURE_LIMIT_LABELS = {
  symptomAnalysisPerMonth: "Phân tích triệu chứng / tháng",
  aiChatPerDay: "Chat AI / ngày",
};

const DEFAULT_QUOTA_LIMIT = "3";
const DEFAULT_QUOTA_RESET_PERIOD = "subscriptionCycle";

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

function getFeatureLimitLabel(key) {
  return FEATURE_LIMIT_LABELS[key] || key;
}

function getQuotaCode(quota) {
  return quota?.quotaCode || quota?.code || "";
}

function getQuotaTitle(quota) {
  return quota?.quotaName || quota?.name || getQuotaCode(quota) || "Hạn mức sử dụng";
}

function getQuotaUnit(quota) {
  return quota?.unit || "lượt";
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

  function updateQuotaRow(index, key, value) {
    setQuotaRows((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
    setErrors((current) => ({ ...current, quotaRows: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    if (mode === "edit" && quotaRows.some((row) => {
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
    onSubmit(buildPayload(form), {
      quotaUpdates: mode === "edit" ? buildQuotaUpdates(quotaRows, quotaCatalog) : [],
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

      <form ref={formRef} className="clean-form subscription-plan-form" onSubmit={handleSubmit} noValidate>
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
                  {...getAdminFieldProps("planName", errors.planName, errors.planName ? "subscription-name-error" : "")}
                  value={form.planName}
                  onChange={(event) => update("planName", event.target.value)}
                  placeholder="Ví dụ: MediMate+ Tháng"
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

              <label className={`clean-field subscription-duration-inline ${errors.durationInDays ? "subscription-field-error" : ""}`}>
                <span>Thời hạn (ngày)</span>
                <input
                  {...getAdminFieldProps("durationInDays", errors.durationInDays, errors.durationInDays ? "subscription-duration-error" : "")}
                  type="number"
                  min="1"
                  step="1"
                  value={form.durationInDays}
                  onChange={(event) => update("durationInDays", event.target.value)}
                  required
                />
                {errors.durationInDays && <small id="subscription-duration-error" role="alert">{errors.durationInDays}</small>}
              </label>

              <label className="clean-field">
                <span>Trạng thái</span>
                <select name="isActive" value={form.isActive} onChange={(event) => update("isActive", event.target.value)}>
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
                <h3>Hạn mức sử dụng</h3>
                <p>Quyền lợi chính được hiển thị cho người dùng khi xem gói.</p>
              </div>
            </div>

            <div
              className={`subscription-limit-editor ${errors.featureLimitJson ? "subscription-field-error" : ""}`}
              data-error-field="featureLimitJson"
              tabIndex={errors.featureLimitJson ? -1 : undefined}
              aria-invalid={errors.featureLimitJson ? "true" : undefined}
              aria-describedby="subscription-feature-help"
            >
              <div className="subscription-limit-editor-head">
                <span>Quyền lợi trong gói</span>
              </div>

              <div className="subscription-limit-editor-list">
                {featureLimitEntries.map((item, index) => (
                  <article className="subscription-limit-editor-row" key={`${item.key}-${index}`}>
                    <div className="subscription-limit-name">
                      <span>Quyền lợi</span>
                      <strong>{getFeatureLimitLabel(item.key)}</strong>
                    </div>
                    <label className="clean-field">
                      <span>Số lượt</span>
                      <input
                        name={`featureLimit.${index}.limit`}
                        value={item.limit}
                        onChange={(event) => updateFeatureLimit(index, "limit", event.target.value)}
                        placeholder="Ví dụ: 30"
                      />
                    </label>
                  </article>
                ))}
              </div>

              <small id="subscription-feature-help" role={errors.featureLimitJson ? "alert" : undefined}>
                {errors.featureLimitJson || "Các thay đổi sẽ được lưu cùng gói khi bấm nút lưu bên dưới."}
              </small>
            </div>
          </section>

          {mode === "edit" && (
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
                {quotaRows.length ? quotaRows.map((row, index) => (
                  <article className="subscription-real-quota-row" key={`${row.quotaCode || row.quotaId}-${index}`}>
                    <div className="subscription-real-quota-name">
                      <span>Hạn mức</span>
                      <strong>{row.name}</strong>
                      <small>{row.unit} - mỗi chu kỳ gói</small>
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
          )}
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
