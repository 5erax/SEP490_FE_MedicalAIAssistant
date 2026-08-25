import { useMemo, useRef, useState } from "react";
import { Check, FlaskConical, Languages, MessageSquareText, Ruler, X } from "lucide-react";
import { Button, Dialog, Field, Select, Textarea, TextInput } from "../ui";

const DEFAULT_ADVICE_SEVERITY = "info";

const EMPTY_INDICATOR_FORM = {
  symbol: "",
  fullName: "",
  unit: "",
  minReference: "",
  maxReference: "",
  description: "",
  category: "",
  isActive: true,
};

const EMPTY_ALIAS_FORM = { aliasText: "", language: "", isPrimary: false };
const EMPTY_RANGE_FORM = {
  gender: "",
  ageGroup: "",
  comparisonType: "",
  minValue: "",
  maxValue: "",
  unit: "",
};
const EMPTY_ADVICE_FORM = {
  status: "",
  displayTitle: "",
  summary: "",
  possibleCauses: "",
  lifestyleAdvice: "",
  nutritionalAdvice: "",
  urgencyLevel: "",
  severityLevel: DEFAULT_ADVICE_SEVERITY,
  warningSigns: "",
};

const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

const AGE_GROUP_OPTIONS = [
  { value: "child", label: "Trẻ em" },
  { value: "adult", label: "Người lớn" },
];

const COMPARISON_OPTIONS = [
  { value: "between", label: "Trong khoảng" },
  { value: "lessThanOrEqual", label: "Nhỏ hơn hoặc bằng" },
  { value: "greaterThanOrEqual", label: "Lớn hơn hoặc bằng" },
];

const STATUS_OPTIONS = [
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "low", label: "Thấp" },
];

const SEVERITY_OPTIONS = [
  { value: "info", label: "Thông tin" },
  { value: "warning", label: "Cần chú ý" },
  { value: "critical", label: "Khẩn cấp" },
];

const CHILD_DIALOG_META = {
  alias: {
    icon: Languages,
    eyebrow: "Tên gọi thay thế",
    noun: "bí danh",
  },
  range: {
    icon: Ruler,
    eyebrow: "Ngưỡng tham chiếu",
    noun: "khoảng tham chiếu",
  },
  advice: {
    icon: MessageSquareText,
    eyebrow: "Nội dung hướng dẫn",
    noun: "lời khuyên",
  },
};

function nullableText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasFieldErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function focusValidationFeedback(formRef, submitErrorRef, fieldErrors) {
  window.requestAnimationFrame(() => {
    if (hasFieldErrors(fieldErrors)) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    submitErrorRef.current?.focus();
  });
}

function SubmitError({ message, errorRef }) {
  if (!message) return null;

  return (
    <p className="lab-form-submit-error" role="alert" tabIndex={-1} ref={errorRef}>
      {message}
    </p>
  );
}

function indicatorToForm(indicator) {
  return {
    ...EMPTY_INDICATOR_FORM,
    symbol: indicator?.symbol ?? "",
    fullName: indicator?.fullName ?? "",
    unit: indicator?.unit ?? "",
    minReference: indicator?.minReference ?? "",
    maxReference: indicator?.maxReference ?? "",
    description: indicator?.description ?? "",
    category: indicator?.category ?? "",
    isActive: indicator?.isActive !== false,
  };
}

function childToForm(kind, item) {
  if (kind === "alias") {
    return {
      ...EMPTY_ALIAS_FORM,
      aliasText: item?.aliasText ?? "",
      language: item?.language ?? "",
      isPrimary: Boolean(item?.isPrimary),
    };
  }
  if (kind === "range") {
    return {
      ...EMPTY_RANGE_FORM,
      gender: item?.gender ?? "",
      ageGroup: item?.ageGroup ?? "",
      comparisonType: item?.comparisonType ?? "",
      minValue: item?.minValue ?? "",
      maxValue: item?.maxValue ?? "",
      unit: item?.unit ?? "",
    };
  }
  return {
    ...EMPTY_ADVICE_FORM,
    status: item?.status ?? "",
    displayTitle: item?.displayTitle ?? "",
    summary: item?.summary ?? "",
    possibleCauses: item?.possibleCauses ?? "",
    lifestyleAdvice: item?.lifestyleAdvice ?? "",
    nutritionalAdvice: item?.nutritionalAdvice ?? "",
    urgencyLevel: item?.urgencyLevel ?? "",
    severityLevel: item?.severityLevel || DEFAULT_ADVICE_SEVERITY,
    warningSigns: item?.warningSigns ?? "",
  };
}

function validateReferenceOrder(minValue, maxValue) {
  if (minValue === "" || maxValue === "") return "";
  return Number(minValue) <= Number(maxValue)
    ? ""
    : "MinReference không được lớn hơn MaxReference";
}

function getIndicatorFieldErrors(message = "") {
  if (message.startsWith("Symbol") || message.startsWith("Ký hiệu chỉ số")) return { symbol: message };
  if (message.startsWith("MinReference")) return { minReference: message };
  if (message.startsWith("MaxReference")) return { maxReference: message };
  return {};
}

function getChildFieldErrors(kind, message = "") {
  if (kind === "alias" && (message.startsWith("AliasText") || message.startsWith("Alias đã"))) {
    return { aliasText: message };
  }
  if (kind === "range") {
    if (message.startsWith("Khoảng tham chiếu không thể")) return { gender: message };
    if (message.startsWith("Khoảng tham chiếu cho giới tính")) return { gender: message };
    if (message.startsWith("Khoảng tham chiếu cho nhóm tuổi")) return { ageGroup: message };
    if (message.startsWith("So sánh Between")) return { minValue: message };
    if (message.startsWith("MinValue")) return { minValue: message };
    if (message.startsWith("MaxValue")) return { maxValue: message };
    if (message.startsWith("So sánh LessThanOrEqual")) return { maxValue: message };
    if (message.startsWith("So sánh GreaterThanOrEqual")) return { minValue: message };
  }
  if (kind === "advice" && (message.startsWith("Status") || message.startsWith("Advice cache đã"))) {
    return { status: message };
  }
  return {};
}

export function LabIndicatorFormDialog({ indicator, saving, restoreFocusRef, onClose, onSubmit }) {
  const editing = Boolean(indicator);
  const [form, setForm] = useState(() => indicatorToForm(indicator));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef(null);
  const firstInputRef = useRef(null);
  const submitErrorRef = useRef(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current, [field]: "" };
      if (field === "minReference" || field === "maxReference") {
        next.minReference = "";
        next.maxReference = "";
      }
      return next;
    });
    setSubmitError("");
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.symbol.trim()) {
      nextErrors.symbol = editing ? "Symbol không được để trống" : "Symbol là bắt buộc";
    }
    const referenceOrderError = validateReferenceOrder(form.minReference, form.maxReference);
    if (referenceOrderError) nextErrors.maxReference = referenceOrderError;

    setErrors(nextErrors);
    setSubmitError("");
    if (hasFieldErrors(nextErrors)) {
      focusValidationFeedback(formRef, submitErrorRef, nextErrors);
      return;
    }

    const result = await onSubmit({
      symbol: nullableText(form.symbol),
      fullName: nullableText(form.fullName),
      unit: nullableText(form.unit),
      minReference: nullableNumber(form.minReference),
      maxReference: nullableNumber(form.maxReference),
      description: nullableText(form.description),
      category: nullableText(form.category),
      isActive: Boolean(form.isActive),
    });

    if (result?.success === false) {
      const fieldErrors = getIndicatorFieldErrors(result.message);
      setErrors(fieldErrors);
      setSubmitError(hasFieldErrors(fieldErrors) ? "" : result.message);
      focusValidationFeedback(formRef, submitErrorRef, fieldErrors);
    }
  }

  return (
    <Dialog
      className="doctor-modal lab-dialog"
      backdropClassName="doctor-modal-backdrop"
      labelledBy="lab-indicator-dialog-title"
      describedBy="lab-indicator-dialog-description"
      initialFocusRef={firstInputRef}
      restoreFocusRef={restoreFocusRef}
      onClose={() => { if (!saving) onClose(); }}
    >
      <header className="doctor-modal-header lab-dialog-header">
        <span className="lab-dialog-icon" aria-hidden="true"><FlaskConical size={22} /></span>
        <div>
          <p>{editing ? "Cập nhật danh mục" : "Thêm vào danh mục"}</p>
          <h2 id="lab-indicator-dialog-title">{editing ? "Sửa chỉ số xét nghiệm" : "Tạo chỉ số xét nghiệm"}</h2>
          <small id="lab-indicator-dialog-description">Thông tin sẽ được lưu vào danh mục chỉ số xét nghiệm.</small>
        </div>
        <button className="doctor-modal-close" type="button" aria-label="Đóng form chỉ số" onClick={onClose} disabled={saving}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <form ref={formRef} className="clean-form doctor-form lab-dialog-form lab-indicator-dialog-form" onSubmit={submit} noValidate>
        <div className="lab-dialog-body lab-indicator-dialog-body">
          <SubmitError message={submitError} errorRef={submitErrorRef} />
          <div className="lab-form-sections">
            <fieldset className="lab-form-section">
              <legend>
                <span>Thông tin định danh</span>
                <small>Tên và quy ước hiển thị của chỉ số.</small>
              </legend>
              <div className="lab-form-grid">
                <Field id="lab-symbol" label="Ký hiệu" required error={errors.symbol} hint="Ví dụ: WBC, HGB hoặc ALT.">
                  <TextInput ref={firstInputRef} name="symbol" value={form.symbol} onChange={(event) => update("symbol", event.target.value)} />
                </Field>
                <Field id="lab-fullName" label="Tên đầy đủ" optional error={errors.fullName}>
                  <TextInput name="fullName" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
                </Field>
                <Field id="lab-category" label="Nhóm chỉ số" optional>
                  <TextInput name="category" value={form.category} onChange={(event) => update("category", event.target.value)} />
                </Field>
                <Field id="lab-unit" label="Đơn vị mặc định" optional>
                  <TextInput name="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="lab-form-section">
              <legend>
                <span>Khoảng tham chiếu mặc định</span>
                <small>Có thể để trống nếu chỉ số dùng các range chi tiết riêng.</small>
              </legend>
              <div className="lab-form-grid">
                <Field id="lab-minReference" label="Tham chiếu tối thiểu" optional error={errors.minReference}>
                  <TextInput name="minReference" inputMode="decimal" value={form.minReference} onChange={(event) => update("minReference", event.target.value)} />
                </Field>
                <Field id="lab-maxReference" label="Tham chiếu tối đa" optional error={errors.maxReference}>
                  <TextInput name="maxReference" inputMode="decimal" value={form.maxReference} onChange={(event) => update("maxReference", event.target.value)} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="lab-form-section">
              <legend>
                <span>Hiển thị và trạng thái</span>
                <small>Bổ sung ngữ cảnh cho người quản trị và các luồng xét nghiệm.</small>
              </legend>
              <div className="lab-form-grid">
                <Field id="lab-description" label="Mô tả" optional className="lab-form-span-2">
                  <Textarea name="description" rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} />
                </Field>
                <label className="lab-checkbox lab-form-span-2" htmlFor="lab-isActive">
                  <input id="lab-isActive" name="isActive" type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} />
                  <span>
                    <strong>Đang sử dụng</strong>
                    <small>Cho phép chỉ số xuất hiện trong các luồng xử lý xét nghiệm.</small>
                  </span>
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        <div className="doctor-modal-actions lab-dialog-actions">
          <Button tone="secondary" type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving} loadingLabel="Đang lưu…"><Check size={16} aria-hidden="true" /> {editing ? "Lưu thay đổi" : "Tạo chỉ số"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function AliasFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid">
      <Field id="lab-aliasText" label="Tên bí danh" required error={errors.aliasText} className="lab-form-span-2">
        <TextInput ref={firstInputRef} name="aliasText" value={form.aliasText} onChange={(event) => update("aliasText", event.target.value)} />
      </Field>
      <Field id="lab-language" label="Ngôn ngữ" optional hint="Ví dụ: vi hoặc en.">
        <TextInput name="language" value={form.language} onChange={(event) => update("language", event.target.value)} />
      </Field>
      <label className="lab-checkbox" htmlFor="lab-isPrimary">
        <input id="lab-isPrimary" name="isPrimary" type="checkbox" checked={form.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} />
        <span><strong>Bí danh chính</strong><small>Đánh dấu tên gọi được ưu tiên hiển thị.</small></span>
      </label>
    </div>
  );
}

function RangeFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid">
      <Field id="lab-gender" label="Giới tính" optional error={errors.gender}>
        <Select ref={firstInputRef} name="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
          <option value="">Chọn giới tính</option>
          {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-ageGroup" label="Nhóm tuổi" optional error={errors.ageGroup}>
        <Select name="ageGroup" value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)}>
          <option value="">Chọn nhóm tuổi</option>
          {AGE_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-comparisonType" label="Kiểu so sánh" required error={errors.comparisonType} className="lab-form-span-2">
        <Select name="comparisonType" value={form.comparisonType} onChange={(event) => update("comparisonType", event.target.value)}>
          <option value="">Chọn kiểu so sánh</option>
          {COMPARISON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-minValue" label="Giá trị tối thiểu" optional error={errors.minValue}>
        <TextInput name="minValue" inputMode="decimal" value={form.minValue} onChange={(event) => update("minValue", event.target.value)} />
      </Field>
      <Field id="lab-maxValue" label="Giá trị tối đa" optional error={errors.maxValue}>
        <TextInput name="maxValue" inputMode="decimal" value={form.maxValue} onChange={(event) => update("maxValue", event.target.value)} />
      </Field>
      <Field id="lab-unit" label="Đơn vị" optional className="lab-form-span-2">
        <TextInput name="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} />
      </Field>
    </div>
  );
}

function AdviceFields({ form, errors, update, firstInputRef }) {
  return (
    <div className="lab-form-grid lab-advice-form-grid">
      <Field id="lab-status" label="Trạng thái kết quả" required error={errors.status}>
        <Select ref={firstInputRef} name="status" value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="">Chọn trạng thái</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-displayTitle" label="Tiêu đề hiển thị" optional>
        <TextInput name="displayTitle" value={form.displayTitle} onChange={(event) => update("displayTitle", event.target.value)} />
      </Field>
      <Field id="lab-severityLevel" label="Mức độ" required>
        <Select name="severityLevel" value={form.severityLevel} onChange={(event) => update("severityLevel", event.target.value)}>
          {SEVERITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </Field>
      <Field id="lab-urgencyLevel" label="Mức ưu tiên" optional>
        <TextInput
          name="urgencyLevel"
          value={form.urgencyLevel}
          placeholder="Ví dụ: Trao đổi với bác sĩ trong lần khám tới"
          onChange={(event) => update("urgencyLevel", event.target.value)}
        />
      </Field>
      <Field id="lab-summary" label="Tóm tắt" optional className="lab-form-span-2">
        <Textarea name="summary" rows="3" value={form.summary} onChange={(event) => update("summary", event.target.value)} />
      </Field>
      <Field id="lab-possibleCauses" label="Nguyên nhân có thể" optional>
        <Textarea name="possibleCauses" rows="4" value={form.possibleCauses} onChange={(event) => update("possibleCauses", event.target.value)} />
      </Field>
      <Field id="lab-warningSigns" label="Dấu hiệu cảnh báo" optional>
        <Textarea name="warningSigns" rows="4" value={form.warningSigns} onChange={(event) => update("warningSigns", event.target.value)} />
      </Field>
      <Field id="lab-lifestyleAdvice" label="Lời khuyên lối sống" optional>
        <Textarea name="lifestyleAdvice" rows="4" value={form.lifestyleAdvice} onChange={(event) => update("lifestyleAdvice", event.target.value)} />
      </Field>
      <Field id="lab-nutritionalAdvice" label="Lời khuyên dinh dưỡng" optional>
        <Textarea name="nutritionalAdvice" rows="4" value={form.nutritionalAdvice} onChange={(event) => update("nutritionalAdvice", event.target.value)} />
      </Field>
    </div>
  );
}

function validateChildForm(kind, form) {
  const errors = {};
  if (kind === "alias" && !form.aliasText.trim()) errors.aliasText = "AliasText là bắt buộc";
  if (kind === "range") {
    if (form.gender && form.ageGroup) {
      errors.gender = "Khoảng tham chiếu không thể đặt cả Gender và AgeGroup";
    }
    if (!form.comparisonType) errors.comparisonType = "Chọn kiểu so sánh.";
    if (form.comparisonType === "between") {
      if (form.minValue === "" || form.maxValue === "") {
        errors.minValue = "So sánh Between yêu cầu MinValue và MaxValue";
      } else if (Number(form.minValue) > Number(form.maxValue)) {
        errors.maxValue = "MinValue không được lớn hơn MaxValue";
      }
    }
    if (form.comparisonType === "lessThanOrEqual" && form.maxValue === "") {
      errors.maxValue = "So sánh LessThanOrEqual yêu cầu MaxValue";
    }
    if (form.comparisonType === "greaterThanOrEqual" && form.minValue === "") {
      errors.minValue = "So sánh GreaterThanOrEqual yêu cầu MinValue";
    }
  }
  if (kind === "advice" && (!form.status || form.status === "unknown")) {
    errors.status = "Status không được là Unknown";
  }
  return errors;
}

function childPayload(kind, form) {
  if (kind === "alias") {
    return {
      aliasText: nullableText(form.aliasText),
      language: nullableText(form.language),
      isPrimary: Boolean(form.isPrimary),
    };
  }
  if (kind === "range") {
    return {
      gender: nullableText(form.gender),
      ageGroup: nullableText(form.ageGroup),
      comparisonType: form.comparisonType,
      minValue: nullableNumber(form.minValue),
      maxValue: nullableNumber(form.maxValue),
      unit: nullableText(form.unit),
    };
  }
  return {
    status: form.status,
    displayTitle: nullableText(form.displayTitle),
    summary: nullableText(form.summary),
    possibleCauses: nullableText(form.possibleCauses),
    lifestyleAdvice: nullableText(form.lifestyleAdvice),
    nutritionalAdvice: nullableText(form.nutritionalAdvice),
    urgencyLevel: nullableText(form.urgencyLevel),
    severityLevel: form.severityLevel || DEFAULT_ADVICE_SEVERITY,
    warningSigns: nullableText(form.warningSigns),
  };
}

export function LabIndicatorChildDialog({ kind, item, saving, restoreFocusRef, onClose, onSubmit }) {
  const editing = Boolean(item);
  const meta = CHILD_DIALOG_META[kind];
  const Icon = meta.icon;
  const [form, setForm] = useState(() => childToForm(kind, item));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef(null);
  const submitErrorRef = useRef(null);
  const firstInputRef = useRef(null);

  const title = useMemo(
    () => `${editing ? "Sửa" : "Tạo"} ${meta.noun}`,
    [editing, meta.noun],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current, [field]: "" };
      if (kind === "range" && (field === "gender" || field === "ageGroup")) {
        next.gender = "";
        next.ageGroup = "";
      }
      if (kind === "range" && ["comparisonType", "minValue", "maxValue"].includes(field)) {
        next.minValue = "";
        next.maxValue = "";
        next.comparisonType = "";
      }
      return next;
    });
    setSubmitError("");
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateChildForm(kind, form);
    setErrors(nextErrors);
    setSubmitError("");
    if (hasFieldErrors(nextErrors)) {
      focusValidationFeedback(formRef, submitErrorRef, nextErrors);
      return;
    }

    const result = await onSubmit(childPayload(kind, form));
    if (result?.success === false) {
      const fieldErrors = getChildFieldErrors(kind, result.message);
      setErrors(fieldErrors);
      setSubmitError(hasFieldErrors(fieldErrors) ? "" : result.message);
      focusValidationFeedback(formRef, submitErrorRef, fieldErrors);
    }
  }

  return (
    <Dialog
      className={`doctor-modal lab-dialog lab-child-dialog lab-child-dialog-${kind}`}
      backdropClassName="doctor-modal-backdrop"
      labelledBy="lab-child-dialog-title"
      describedBy="lab-child-dialog-description"
      initialFocusRef={firstInputRef}
      restoreFocusRef={restoreFocusRef}
      onClose={() => { if (!saving) onClose(); }}
    >
      <header className="doctor-modal-header lab-dialog-header">
        <span className="lab-dialog-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <p>{meta.eyebrow}</p>
          <h2 id="lab-child-dialog-title">{title}</h2>
          <small id="lab-child-dialog-description">Mục này luôn được lưu dưới indicator hiện tại.</small>
        </div>
        <button className="doctor-modal-close" type="button" aria-label={`Đóng form ${meta.noun}`} onClick={onClose} disabled={saving}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <form ref={formRef} className="clean-form doctor-form lab-dialog-form" onSubmit={submit} noValidate>
        <div className="lab-dialog-body">
          <SubmitError message={submitError} errorRef={submitErrorRef} />
          {kind === "alias" && <AliasFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
          {kind === "range" && <RangeFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
          {kind === "advice" && <AdviceFields form={form} errors={errors} update={update} firstInputRef={firstInputRef} />}
        </div>
        <div className="doctor-modal-actions lab-dialog-actions">
          <Button tone="secondary" type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" loading={saving} loadingLabel="Đang lưu…"><Check size={16} aria-hidden="true" /> {editing ? "Lưu thay đổi" : title}</Button>
        </div>
      </form>
    </Dialog>
  );
}
